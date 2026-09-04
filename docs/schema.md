# Schema

MongoDB, five collections. Mongoose schemas are in `backend/models/`.

## Collections

### `users`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | String | required, trimmed |
| `email` | String | required, unique, lowercased |
| `password` | String | required, min 6, bcrypt hash, `select: false` |
| `role` | String | `employee` \| `approver`, default `employee` |
| `createdAt` | Date | |

`password` is excluded from queries by default, so it can only leak if a query asks for it
explicitly. Login is the only place that does.

### `expensereports`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `title` | String | required, trimmed, max 120 |
| `dateFrom` / `dateTo` | Date | required; `dateTo >= dateFrom` checked on validate |
| `status` | String | `Draft` \| `Submitted` \| `Approved` \| `Paid`, default `Draft` |
| `owner` | ObjectId → users | required |
| `assignedApprovers` | [ObjectId → users] | may be empty while Draft; submission requires at least one |
| `total` | Number | server-maintained, min 0 |
| `rejectionReason` | String | set on rejection, cleared on resubmit |
| `isArchived` | Boolean | default false |
| `submittedAt` | Date | set on first submit, never cleared |
| `approvedAt` / `paidAt` | Date | set on those transitions |
| `createdAt` / `updatedAt` | Date | Mongoose timestamps |

There is no `Rejected` status. Rejection sends a report back to `Draft` with a reason attached — see
`decisions.md`.

### `expenselines`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `report` | ObjectId → expensereports | required, indexed |
| `date` | Date | required |
| `amount` | Number | required, min 0 |
| `category` | String | enum: Travel, Meals, Accommodation, Supplies, Other |
| `description` | String | required, trimmed, max 500 |
| `createdAt` | Date | |

### `auditlogs`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `report` | ObjectId → expensereports | required |
| `changedBy` | ObjectId → users | required |
| `type` | String | `status_change` \| `comment` |
| `oldStatus` / `newStatus` | String | status changes only |
| `reason` | String | rejections only |
| `comment` | String | comments only |
| `createdAt` | Date | |

### `alerts`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `report` | ObjectId → expensereports | required |
| `approver` | ObjectId → users | required |
| `dismissedAt` | Date | null while active |
| `createdAt` | Date | |

## Relationships

**One-to-many**

- User → ExpenseReport, via `owner`. A report has exactly one owner and that never changes.
- ExpenseReport → ExpenseLine, via `report` on the line.
- ExpenseReport → AuditLog, and User → AuditLog via `changedBy`.

**Many-to-many**

- ExpenseReport ↔ User (as approvers), via the `assignedApprovers` array on the report. Any number of
  approvers per report, any number of reports per approver.

I embedded that as an array of references rather than making a join collection because the array is
small and bounded (a handful of approvers), it's always read together with the report, and the only
queries that need it are "is this user assigned to this report" and "reports assigned to this user" —
both of which a multikey index on the array serves directly.

**One-to-one-ish**

- Alert is effectively a join row between a report and an approver, carrying dismissal state. A
  unique compound index on `(report, approver)` enforces one alert per pair.

## Constraints: database vs application

**In the database** — anything expressible as a per-document rule or an index:

- `required`, enum membership, `min: 0` on amounts, string lengths, the `dateTo >= dateFrom` check.
  These are Mongoose validators, so they run on every `save()` and `create()`.
- Unique index on `users.email`.
- Unique compound index on `alerts.(report, approver)`. This is load-bearing: alert creation uses an
  upsert, and the index is what makes two concurrent requests converge on one alert rather than
  creating duplicates.

**In the application** — anything that spans documents or depends on who is asking:

- Ownership: only the owner can edit, submit, archive or delete their report.
- The self-approval ban: an approver may not decide on a report they own.
- Legal transitions: Draft → Submitted → Approved → Paid, or Submitted → Draft on rejection.
- `total` equals the sum of its lines.
- A rejection requires a reason.
- Delete is only allowed before a report's first submission.
- Assigned approvers must actually hold the approver role.

**Where I drew the line, and why.** MongoDB has no foreign keys, no cross-document CHECK constraints
and — on a standalone deployment — no transactions, so the second list has nowhere else to live.
What I did do is stop those rules being *sequential* checks in application code. Wherever a rule can
be written as a query predicate, it goes into the write itself:

```js
findOneAndUpdate({ _id, status: 'Submitted', owner: { $ne: userId } }, { $set: { ... } })
```

That's still "enforced by the application" in the sense that Mongo doesn't know what the rule means,
but it's enforced *atomically*, which is the property that actually matters. The alternative —
read, check in JavaScript, then save — leaves a window where a second request can slip through, and
that window is exactly where double approvals come from.

## What I denormalised, deliberately

**`total` on the report.** It duplicates `SUM(lines.amount)`. Every list view, the dashboard's
reimbursements-due figure and the CSV export need a report's total, and recomputing it per row would
be an aggregation per report. It's maintained with `$inc` on the three line mutations, guarded on the
report still being a Draft, so concurrent edits compose rather than overwrite. The risk is drift if
an `$inc` ever fails after its line write. `utils/recalculateTotal.js` exists as a repair helper; the
seed uses its own equivalent calculation when it creates demo lines.

**`rejectionReason` on the report.** Also present on the audit row for the rejection. The report
needs it so the owner sees why without loading the timeline, and it's what the delete rule and the
UI both key off.

**`submittedAt` / `approvedAt` / `paidAt`.** All three are derivable from the audit log, but every
dashboard number and the stale-alert query would then need to join through it. Explicit columns make
those single indexed range queries. `submittedAt` also does real work beyond speed: it's never
cleared, so it's the permanent marker that a report has been through the flow, which is what stops a
rejected report (back in Draft) being deleted.

I originally used `updatedAt` for all of this, which was wrong — any unrelated write to a report
moved it, silently resetting the staleness clock and shifting reports between weeks on the dashboard
chart. Replacing it with explicit transition timestamps fixed a whole class of quiet bugs at once.

## What breaks first at 100x

**Alert sync, and it isn't close.** Every call to the alerts list *and* the badge count runs a query
for that approver's stale reports and then an upsert per stale report. The badge polls. With 100x the
reports and a room full of approvers, that's the hottest path in the system doing the most work. The
fix is to move generation to a scheduled job and let both endpoints do a plain indexed read.

**Offset pagination.** `skip((page-1)*limit)` makes Mongo walk every skipped document. It's fine at
page 3 and bad at page 300. Cursor pagination on `(submittedAt, _id)` is the answer, at the cost of
losing "jump to page N".

**The title search.** `$regex` with `$options: 'i'` and no leading anchor can't use an index, so it's
a collection scan behind whatever the other filters narrow it to. At 100x it needs a proper text
index or an external search index. (The regex is escaped before it goes into the query — an
unescaped user string is both a correctness bug and a ReDoS.)

**The category breakdown.** `ExpenseLine.aggregate([$group by category])` touches every line in
scope. Lines outgrow reports faster than anything else here. A rollup table updated on write, or a
materialised daily summary, is the usual answer.

Indexes currently in place: `(isArchived, status, submittedAt)` and `(owner, isArchived, createdAt)`
on reports for the two list views, `(assignedApprovers, status)` for the queue and alerts, `paidAt`
and `approvedAt` for the dashboard, `report` on lines, `(report, createdAt)` on audit logs, and the
two unique indexes above.
