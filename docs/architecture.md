# Architecture

## The moving pieces

Three of them, and they are deliberately boring.

**A React single-page app.** Built with Vite, routed with React Router, styled with Tailwind. It
holds no business logic — it renders what the API gives it and disables buttons for actions the
server would refuse anyway. Auth state lives in a React context backed by `localStorage`, so a
refresh doesn't sign you out.

**An Express REST API.** Node with Mongoose for data access. This is where every rule lives: who
owns what, which status transitions are legal, who is allowed to decide on a report. Layered as
routes → middleware → controllers, with a few small helpers in `utils/` for the checks that repeat.

**MongoDB.** Five collections: `users`, `expensereports`, `expenselines`, `auditlogs`, `alerts`.

They talk over JSON. The browser sends a `Bearer` token on every request; an axios request
interceptor attaches it, and a response interceptor clears the session on a 401 — but only for
requests that aren't themselves login or register, because a 401 from `/auth/login` is an answer
about the password you just typed, not an expired session.

## Where each piece runs

| Piece | Runs |
|---|---|
| React SPA | Static build served from Vercel at `https://expense-app-nu-ivory.vercel.app` |
| Express API | Node/Express service on Render at `https://expense-app-5f0r.onrender.com` |
| MongoDB | MongoDB Atlas (free tier) |

The API's `MONGO_URI` and `JWT_SECRET` come from environment variables on the host. The SPA gets the
API's public URL from `VITE_API_URL` at build time. Nothing is in the repo.

## One request, end to end

**An approver approves a submitted report.** I picked this one because it's where the interesting
rules are.

1. The approver clicks Approve. The SPA sends `POST /api/reports/:id/approve` with the token.

2. `protect` verifies the JWT, loads the user, and rejects the request if the token is valid but the
   account has since been deleted. `req.user` is set from the database, not from the token payload —
   the token carries only an id, so a role can't be forged by editing the token.

3. `approverOnly` checks `req.user.role === 'approver'` and returns 403 otherwise.

4. The controller does the whole decision in **one** write:

   ```js
   ExpenseReport.findOneAndUpdate(
       { _id: reportId, status: 'Submitted', owner: { $ne: approver._id },
          assignedApprovers: approver._id },
     { $set: { status: 'Approved', approvedAt: now } },
     { new: true }
   )
   ```

   All four conditions — the report exists, it is currently Submitted, the approver does not own it,
   and the approver is assigned — are clauses in the same query. That matters: with a
   read-then-check-then-save sequence,
   two approvers hitting the queue at the same moment both read `Submitted` and both write, and you
   end up with two audit entries for one decision, or an approve and a reject racing to be last. Here
   exactly one write wins.

5. If the update matched nothing, the controller re-reads the report to say *why* — not found, your
   own report, or already decided — and maps that to 404 / 403 / 409 with a message. That re-read is
   only on the failure path, so the happy path stays one round trip.

6. On success it writes an `AuditLog` row (`Submitted → Approved`, who, when) and clears any stale
   alerts for that report, since it is no longer awaiting a decision.

7. The updated report goes back as JSON. The SPA refetches the queue.

The equivalent path for adding an expense line is worth mentioning because it uses the same idea
differently: the line is created, then the report's total is moved with `$inc` guarded on
`status: 'Draft'`. `$inc` is atomic per document, so two people editing lines at once compose
correctly instead of overwriting each other's totals, and the status guard means a line can't slip
into a report that was submitted a moment ago.

## What I decided not to build

**Multi-document transactions.** The status write and its audit-log write are two operations. On a
standalone MongoDB there are no transactions, so a crash between them leaves a status change without
a timeline entry. I chose to accept that rather than move to a replica set: the status write is the
atomic one, so the report is never in a self-contradictory state — only the log can be short. If this
were real, that's the first thing I'd fix, and the fix is `withTransaction` on a replica set.

**A background job for stale alerts.** Alerts are generated lazily when an approver reads the alert
list or the badge count. A cron job would be cleaner and cheaper at scale, but it's another moving
piece to deploy and monitor on a free tier for a feature that only matters when someone is looking at
it. Both endpoints call the same sync function, although the badge count does not apply the list's
final status filter, so old alert records can make the badge temporarily disagree with the list.

**Refresh tokens and session revocation.** JWTs last seven days and there's no denylist. Signing out
clears local storage; the token itself stays valid until it expires. Real session management is a
meaningful chunk of work and none of the ten goals needed it.

**Receipt uploads, OCR, multi-currency, approval chains, department budgets.** All stretch ideas. The
brief is explicit that eight goals done properly beats ten done badly, so I spent the time on the
required ten and on the correctness pass instead.

**An automated test suite.** This is the omission I'm least comfortable with. I verified the
lifecycle rules by hand against the seeded data — every illegal transition, self-approval from both
approver accounts, bulk actions with a self-owned report in the selection. That's reproducible by a
reviewer but it isn't a regression net.

**Admin account management.** Public registration still accepts an `employee` or `approver` role.
That is convenient for the demo, but it would let an untrusted visitor create an approver account.
In a real deployment, registration should always create employees and approver accounts should be
provisioned by an administrator or a controlled seed process.
