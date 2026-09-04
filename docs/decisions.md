# Decisions

## Decision 1 — MongoDB and Mongoose, not Postgres

- **Chose:** MongoDB Atlas with Mongoose.
- **Rejected:** Postgres with Prisma or Knex.
- **Why:** I'm fastest in this stack, and the brief is explicit that no stack scores better and that
  time spent learning something new is time not spent on the ten goals. The schema here is shallow —
  five collections, one genuine many-to-many  so I wasn't giving up much relational power.

  What I *was* giving up became the defining constraint of the codebase, and it's worth naming
  honestly: no foreign keys, no cross-row CHECK constraints, and no transactions on a standalone
  deployment. Every invariant that spans two documents has to live in application code. Most of this
  document is about how I dealt with that. With Postgres, decisions 3 and 4 below would mostly have
  been a `CHECK` and a `SERIALIZABLE` transaction, and I'd have spent that time elsewhere.

## Decision 2 — Rejection returns a report to Draft, with no `Rejected` status

- **Chose:** Rejecting sets the status back to `Draft` and writes `rejectionReason` onto the report.
  There is no `Rejected` value in the status enum.
- **Rejected:** A distinct terminal `Rejected` status with a separate `/resubmit` endpoint to get out
  of it.
- **Why:** The brief says the report "returns to Draft, where its owner can edit it and submit it
  again", and going back to Draft means the existing edit paths just work.

- **Later reversed:** I built the terminal `Rejected` status first, and it was wrong. Every edit path
  in the app — updating the report, adding a line, editing a line, deleting a line — requires status
  `Draft`. So a rejected report couldn't be corrected at all. The only thing its owner could do was
  hit resubmit and send back the identical report that had just been rejected. That is a
  reimplementation of the exact problem in the brief's opening: a rejected report that quietly goes
  nowhere. I collapsed `Rejected` into `Draft + rejectionReason`, kept `/resubmit` pointing at the
  submit handler so the frontend didn't have to change, and the edit-and-resubmit loop worked
  immediately.

  The lesson I'd take from it: a status isn't just a label on a row, it's the key that every
  permission check reads. Adding one means auditing every place that switches on status, and I
  hadn't.

## Decision 3 — Atomic compare-and-set for every status transition

- **Chose:** One `findOneAndUpdate` whose filter carries all the preconditions — the report exists,
  it's in the expected status, and (for a decision) the actor doesn't own it. On a miss, re-read the
  report to produce a specific error.
- **Rejected:** Read the report, check the rules in JavaScript, then `save()`. Also rejected an
  optimistic-concurrency `version` field, and moving to a replica set for real transactions.
- **Why:** The read-check-save version has a window between the read and the write. Two approvers
  working the same queue both read `Submitted`, both write, and the report gets two decisions and two
  audit entries — or an approve and a reject race, and the timeline ends up contradicting the status.
  Folding the preconditions into the filter closes the window with no extra machinery: exactly one
  write matches, and the loser gets told why.

  A version field would work too but adds a field and a retry loop for no extra safety here. A
  replica set would give me real transactions and I'd want one in production, but it's more than a
  free tier gives me and it doesn't change the shape of this fix.

  The honest limitation: the audit-log insert is still a second operation. If the process dies
  between the two, the status moved without a timeline row. The status write is the atomic one, so
  the report is never in an impossible state — only the log can be short.

## Decision 4 — `total` is stored and moved with `$inc`, not recomputed

- **Chose:** Keep `total` on the report and adjust it with `$inc` on every line add, edit and delete,
  guarded on the report still being a Draft.
- **Rejected:** (a) Recompute the sum from the lines and write the result back on every change.
  (b) Drop the stored field and compute the total on read.
- **Why:** (a) is what I wrote first and it has a lost update in it. Two concurrent line edits
  interleave as: T1 reads the lines, T2 adds a line, T2 reads and writes the new sum, T1 writes its
  older sum. The total is now silently wrong and nothing errors. `$inc` is atomic at the document
  level, so the same two edits compose instead.

  (b) is the most correct option and I'd choose it for a smaller app, but the total appears in every
  list row, the dashboard's reimbursements-due figure and the CSV export, so it would mean an
  aggregation per report on the hottest reads.

  The cost of the choice is drift if an `$inc` fails after its line write. `recalculateTotal` exists
  as the repair path. The seed uses its own equivalent calculation when it creates demo lines.

## Decision 5 — Explicit transition timestamps instead of `updatedAt`

- **Chose:** `submittedAt`, `approvedAt`, `paidAt` as real fields, written by the transitions.
- **Rejected:** Deriving all of it from Mongoose's `updatedAt`.
- **Why:** `updatedAt` moves on *any* write. Assigning an approver to a submitted report reset its
  staleness clock, so a report could sit unactioned forever and never raise an alert. The same field
  was bucketing the dashboard's weekly chart, so an unrelated edit moved a report between weeks.

  I could have derived these from the audit log instead — it has every transition with a timestamp —
  but then the stale-alert query and four dashboard numbers all need a join, and they're the queries
  I most want to be a single indexed range scan. Storing them is a denormalisation I'm comfortable
  defending.

  `submittedAt` earned its keep twice over: because it's set on first submit and never cleared, it's
  also the permanent record that a report has been through the approval flow, which is what
  decision 7 relies on.

## Decision 6 — Whitelist the fields a client may write

- **Chose:** Every write handler picks named fields off `req.body`. `status`, `total`, `owner`,
  `isArchived` and the transition timestamps are never accepted from a request.
- **Rejected:** `Object.assign(report, req.body)` and `create({ ...req.body, owner })`, which is what
  I originally wrote.
- **Why:** Mongoose happily assigns any field that exists in the schema, so
  `PUT /api/reports/:id { "status": "Approved", "total": 999999 }` on your own draft self-approved it
  and set an arbitrary total. That defeats goal 3 (the server owns the total) and goal 4 (the
  lifecycle) in one request, and the interface gives no hint it's possible — which is the point of
  the brief's insistence that the rules be enforced on the server.

## Decision 7 — Delete only before a report's first submission

- **Chose:** The owner can hard-delete a report only while `status === 'Draft'` **and**
  `submittedAt === null`. Both are clauses in the delete query, so a submit landing mid-request
  can't be beaten. Everything else archives.
- **Rejected:** (a) No delete at all, archive only. (b) Delete anything you own.
- **Why:** (b) lets an employee erase a rejected report and its timeline, which is the failure the
  system exists to prevent, and it collides directly with goal 9. But (a) is too blunt: a report you
  created by mistake and never submitted has no history worth keeping, and forcing it to live in an
  archive forever is just clutter.

  The rule I landed on states the invariant plainly — *if it has been seen by the approval process,
  it cannot be destroyed* — and `submittedAt` expresses it exactly, including the awkward case of a
  rejected report that is back in `Draft` but has already been through the flow.

- **Later reversed:** I removed the delete endpoint entirely first, on the grounds that goal 9 makes
  the audit trail permanent. That over-corrected. Deleting a never-submitted draft doesn't destroy
  any history, because there isn't any. Reinstating it narrowly was better than either extreme.

## Decision 8 — Scope the 401 interceptor to non-auth requests

- **Chose:** The axios response interceptor clears the session and redirects on a 401 only when the
  failing request wasn't `/auth/login` or `/auth/register`, and only when a token existed.
- **Rejected:** Treating every 401 as an expired session.
- **Why:** A wrong password returns 401. The blanket interceptor caught it, set
  `window.location.href = '/login'`, and the full page reload tore down React before the error toast
  could render — so a failed login showed a blank flash and no message at all. The toast was firing
  correctly the whole time; it was losing a race with a page reload.

  The general point is that a cross-cutting handler reacting to a status code alone can't tell an
  *authentication* failure from an *authorization* failure. Global error handling needs to know which
  requests it doesn't own.

## Decision 9 — Alerts are generated lazily on read

- **Chose:** Both the alerts list and the badge count call the same `syncAlerts` function, which
  upserts alerts for that approver's stale reports and revives dismissed ones past the re-alert
  window.
- **Rejected:** A scheduled job that materialises alerts in the background.
- **Why:** A cron job is another service to deploy and monitor on a free tier, for a feature that only
  matters when someone is looking. Lazy generation keeps it to one deployable.

  The version I wrote first generated alerts *only* in the list handler, so a newly stale report
  showed a badge of zero until someone happened to open the alerts page — the badge failing at
  exactly the job it exists to do. Sharing one function between both endpoints fixed it. The upsert
  plus the unique index on `(report, approver)` is what stops two concurrent requests creating
  duplicate alerts.

  At scale this is the first thing that breaks (see `schema.md`), and the fix then is the cron job I
  skipped now.
