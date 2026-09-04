# Plan

## How I split the work

Roughly two hours a session, one session a day, following the brief's suggested pacing. Each session
had one theme so I could stop cleanly at the end of it and pick up without re-reading everything.

| # | Session | What I set out to do | Est. | Actual |
|---|---|---|---|---|
| 1 | Foundations | Repo layout, Mongoose models, register/login, JWT middleware, role middleware | 2h | 3h |
| 2 | Reports and lines | Report CRUD, line CRUD, server-calculated total, archive/restore | 2h | 1.5h |
| 3 | Lifecycle | Submit, approve, reject, mark paid, the self-approval ban, assigned approvers | 2h | 1.5h |
| 4 | Finding and acting in bulk | Server-side search, filters, sort, pagination; bulk approve/reject; CSV export | 2h | 1|
| 5 | Dashboard, timeline, alerts | Headline numbers, breakdowns, weekly chart, audit timeline, stale alerts | 2h | 2|
| 6 | Hardening | Correctness pass over the backend, then deploy and seed | 2h | 1h |
| — | Docs | Written alongside, mostly at the end of each session | — | 1h |



## The order, and why that order

I built back to front and bottom up: models, then the rules over them, then the views onto them.
Each session's output was the input to the next, so nothing was blocked waiting on something else.

**Auth first** because every other endpoint needs `req.user`, and getting roles wrong at the bottom
means fixing every controller later.

**Reports and lines before the lifecycle**, because a lifecycle needs something to move through. This
is also where the total-is-server-owned rule landed, since it's a property of the data rather than of
the workflow.

**The lifecycle before the views.** The queue, the dashboard and the alerts are all just different
questions asked of `status`, so the transitions had to be right first. This was the longest session
and the one I'd budget more for next time — the self-approval rule and the "any other transition must
be refused with a message explaining why" requirement are more finicky than they read.

**Search, bulk and CSV together**, because they're all the same shape: the server does the work and
the client just renders the answer.

**Dashboard, timeline and alerts last** because they're read-only over everything already built. The
dashboard in particular is a good check on the model — if a number is awkward to compute, something
upstream is modelled wrong, and that's exactly how I found the `updatedAt` problem in decision 5.

**A deliberate hardening session at the end.** I re-read the whole backend looking specifically for
authorization gaps, mass assignment, and races, rather than for features. This was the most valuable
two hours of the project and it's where most of `decisions.md` comes from: the double-approval race,
the lost update in the total, the missing ownership check on report reads, `Object.assign(req.body)`,
and the stale-alert clock. None of those show up when you're clicking through the app as a single
user, which is exactly why the pass was worth scheduling instead of hoping to notice.

## Estimates vs reality


- The lifecycle session ran over. Writing the transitions is quick; making every illegal move return
  a *specific* reason rather than a generic 400 is what takes the time.
- The dashboard was faster than expected once the timestamp fields existed, and much slower before
  them — I lost time to numbers that looked plausible but were wrong, which is worse than numbers
  that are obviously broken.
- The hardening pass took longer than the two hours I'd set aside, because two of the findings
  (rejection returning to Draft, and the delete rule) turned into design changes rather than fixes.

## What I cut

**Automated tests.** The clearest casualty. I verified by hand against seeded data — every illegal
transition, self-approval attempted from both approver accounts, bulk actions containing a report the
approver owns, dismiss-and-re-alert on the stale report. Repeatable by a reviewer, but not a
regression net, and I'd write the transition tests first if I picked this up again.

**Every stretch idea.** Receipts and OCR, mileage, multi-currency, approval chains, per-category
limits. The brief says eight goals done well beats ten done badly, and I'd rather the ten be solid.

**Refresh tokens and real session revocation.** Seven-day JWTs, sign-out clears local storage.

**A background job for alerts.** Lazy generation on read instead — see decision 9.

**Archived reports in the approver's list view.** Employees can toggle their own archive; the
cross-employee list only shows unarchived. Nothing in the brief asks for the other case and I left it
rather than half-build it.
