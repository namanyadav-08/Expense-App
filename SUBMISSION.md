# Submission

## Links

- **GitHub repository:** https://github.com/namanyadav-08/Expense-App
- **Live application:** https://expense-app-nu-ivory.vercel.app

## Notes for the reviewer

The backend is on a free tier and sleeps when idle, so the **first request after a quiet period can
take up to a minute**. If the login screen hangs on your first attempt, give it a moment and try
again — it isn't broken. 

The database is seeded with four users, a mix of reports in every status, an audit timeline on
several of them, and one report deliberately left submitted for six days so the stale-approval alert
and its badge are visible without waiting.

Two things worth knowing before you read the code:

- There is no `Rejected` status. Rejecting a report sends it back to `Draft` with the reason attached,
  which is what the brief describes and what makes edit-and-resubmit work. `docs/decisions.md`
  covers why I built it the other way first and what changed my mind.
- Status transitions are single atomic `findOneAndUpdate` calls with the preconditions in the filter,
  not read-check-save. That's deliberate and `docs/decisions.md` explains what it's protecting
  against.

## Demo credentials

Password is the same for all four accounts.

| Role | Email | Password |
|------|-------|----------|
| Employee | alice@demo.com | demo1234 |
| Employee | bob@demo.com | demo1234 |
| Approver | carol@demo.com | demo1234 |
| Approver | dave@demo.com | demo1234 |

Two of each on purpose. Carol owns a submitted report of her own, so signing in as Carol and trying
to approve it shows the self-approval rule refusing on the server; Dave can approve the same report.
Selecting it alongside others in a bulk action shows the per-report result naming it specifically.

## Stack

| Layer | What I used | Why |
|-------|---------------|-----|
| Frontend | React (Vite), React Router, Tailwind, axios | The stack I'm fastest in. No state library — the app is mostly fetch-and-render, so context plus local state was enough. |
| Backend | Node, Express, Mongoose, JWT, bcrypt | Same reason. Plain layered Express keeps the rules easy to point at, which matters more here than any framework feature. |
| Database | MongoDB Atlas (free tier) | Shallow schema, one real many-to-many. The application does not currently use MongoDB transactions, so the status update and audit-log
write are separate operations. |
| Hosting | _[fill in: e.g. Vercel for the SPA, Render for the API, Atlas for the database]_ | Free tiers, and the API's URL is the only thing the frontend needs to know. |

## Goal checklist

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | Accounts and roles | Done | Public registration currently accepts either role for demo purposes. In production, registration
should always create employees and approver accounts should be provisioned separately. |
| 2 | Expense reports | Done | Title, date range, owner-scoped, editable while Draft, archive and restore. Hard delete exists but only for a report that has never been submitted, so no history is ever destroyed. |
| 3 | Expense lines | Done | Date, amount, fixed-list category, description. Total is server-owned and moved with `$inc`; the client cannot set it, and the write handlers whitelist fields rather than spreading the request body. |
| 4 | Lifecycle with rules | Done | Draft → Submitted → Approved → Paid, and rejection back to Draft with a required reason. Invalid status transitions return 409 with a message naming the current status. Permission
violations, including self-approval and unassigned approval attempts, return 403. |
| 5 | Assigned approvers | Done | Many-to-many via `assignedApprovers`. Full queue and an assigned-to-me list. Assignment is owner-only, validates that the users are actually approvers, and refuses to assign yourself to your own report. |
| 6 | Finding reports | Done | Search, filter by status/owner/approver, sort by submitted date/status/total, paginated with a match count — all server-side. One endpoint for both roles, scoped to the owner for employees. Search input is regex-escaped. |
| 7 | Bulk actions and CSV | Done | Each report in a bulk selection is checked and written independently, and the response names any refused because the approver owned them, alongside every other outcome. CSV export covers approved-not-yet-paid. |
| 8 | Dashboard | Done | Awaiting approval, reimbursements due, approved and paid this week, breakdowns by status and category, and paid-per-week over eight weeks. Computed with aggregations, off explicit transition timestamps rather than `updatedAt`. |
| 9 | Immutable history | Done | Every status change and comment is an append-only audit row with old status, new status, actor and rejection reason. No endpoint anywhere updates or deletes one. Enforced by the absence of a write path rather than at the database level — worth knowing, and it's why delete is restricted the way it is. |
| 10 | Stale-approval alerts | Done | Generation is lazy on read and shared between the list and badge. |

## How much time did you actually spend?

Approximately 13 hours:
- Foundations: 3 hours
- Reports and lines: 1.5 hours
- Lifecycle: 1.5 hours
- Search, bulk actions and CSV: 1 hour
- Dashboard, timeline and alerts: 2 hours
- Hardening, deployment and seeding: 1 hour
- Documentation: 1 hour

## What would you do next, with another 12 hours?

I would start with automated tests for the report lifecycle. The important cases are small and clear:
an owner cannot approve their own report, an unassigned approver cannot make a decision, a Draft
cannot be marked paid, and a rejected report can be edited and submitted again. I would also test
that bulk actions return a separate result for every report.

Next, I would add an admin role. Public registration should create employees only. An admin should
be able to create and disable approver accounts, which is safer than allowing anyone to register as
an approver.

I would then move the status update and audit-log write into a MongoDB transaction. They are currently
separate operations, so a process failure between them could leave a status change without its
history entry.

After that, I would move stale-alert creation to a scheduled job. The current lazy approach is fine
for this size of application, but it does extra work whenever an approver checks the badge.

Finally, I would add receipt attachments. That is the main part of the original email process that
the application does not cover yet.

## What are you least happy with in this codebase, and why?

**The lack of automated tests.** I checked the main cases by hand with the seeded data, but that is
not enough protection for a workflow with this many permission and status rules.

**Approver account management.** The demo lets someone choose the approver role during registration.
That is convenient for testing, but a real application should have an admin create or disable
approver accounts.

**The audit log is protected by application code only.** There is no update or delete endpoint, but
the database does not independently prevent those operations. A transaction and stronger database
permissions would make the history more reliable.

**The frontend could explain errors better.** The server returns the right refusal, but the UI often
shows it in a toast. Bulk actions especially would benefit from a clearer summary of what succeeded
and what failed.

The review pass also came later than it should have. The single-user happy path did not expose the
double-approval race or the mass-assignment issue, so I added that kind of review before finishing.
