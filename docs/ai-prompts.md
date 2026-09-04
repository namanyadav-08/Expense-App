# AI prompts

I used AI throughout, mostly Claude, in two distinct modes: scaffolding code I already knew how to
write, and reviewing code I'd written to find things I'd missed. The second turned out to be far more
valuable than the first.

These are grouped by what I was trying to do rather than transcribed line by line — the prompts
themselves were mostly short and unremarkable ("write an Express controller that does X"), and what
matters is what came back and what I had to change about it.

## 1. Scaffolding the project

### What I asked

Set up the shape of the thing: an Express + Mongoose backend with routes, controllers and middleware
split into folders; a Vite + React frontend with routing, a Tailwind setup and an auth context; JWT
register/login with bcrypt; Mongoose models for users, reports and lines from the field lists in the
brief.

### What I got

Working boilerplate, fast. Sensible folder layout, correct bcrypt pre-save hook, a `protect`
middleware that verified the token and attached the user, an axios instance with a request
interceptor for the bearer token.

### What I corrected

Small things at this stage. The generated `protect` didn't handle a valid token for a user that no
longer exists — `User.findById` returns null, `next()` runs anyway, and the first `req.user._id`
downstream throws a 500. I added the null check. I also tightened the folder split, because the first
pass had a couple of handlers defined inline in the route files while everything else lived in
controllers.

## 2. CRUD and the report lifecycle

### What I asked

Controllers for report and line CRUD with the ownership rules; the status transitions with their
guards; the assigned-approvers relationship; the rule that an approver can never decide on a report
they own.

### What I got

Handlers that implemented the rules correctly for one user at a time, which is exactly the trap. The
generated pattern throughout was: load the document, check the rules in JavaScript, mutate, `save()`.
It reads clearly and it passes every test you do by clicking around as a single user.

### What I corrected

Two things, both found later in the review pass rather than here.

The generated update handler used `Object.assign(report, req.body)`. Mongoose assigns any field in
the schema, so a `PUT` with `{"status": "Approved", "total": 999999}` on your own draft self-approves
it. I replaced it with an explicit field whitelist everywhere a client writes.

And the read-check-save pattern has a race in it — see section 4.

## 3. Dashboard aggregations and the weekly chart

### What I asked

Headline counts, breakdowns by status and category, and a paid-per-week series for the last eight
weeks, computed on the server.

### What I got

A first version that ran eight sequential queries in a loop for the eight chart buckets, loaded every
approved report into memory to sum the totals, and had almost the same block of code duplicated for
the employee and approver cases with the counts recomputed by filtering the same array ten times.

### What I corrected

Replaced the counting with `$group` aggregations, collapsed the two branches into one code path that
differs only by a scope filter, and bounded the chart to a single query over the eight-week window
with the bucketing done in one pass. I kept the bucketing in JavaScript rather than using
`$dateTrunc` on purpose, so the week boundaries come from the same `startOfWeek` function everywhere
instead of splitting the date maths across two timezone contexts.

## 4. Reviewing my own backend — the most useful thing I did with AI

### What I asked

I pasted the whole backend and asked for two specific things rather than a general opinion: how much
of each of the ten goals was actually met, and a scan for redundancy and race conditions.

### What I got

A list, most of which I agreed with and had missed. The ones that mattered:

- **Double-decision race.** Every transition used read-check-`save()`. Two approvers working the
  queue at the same moment both read `Submitted`, both write, and the report gets two audit entries —
  or an approve and a reject race and the timeline contradicts the status.
- **Lost update on `total`.** `recalculateTotal` read all the lines, summed in Node and wrote the
  result. Two concurrent line edits interleave so that the later write carries the older sum.
- **Missing authorization on report reads.** `GET /reports/:id` and `/:id/history` had no ownership
  check at all — any authenticated employee could read anyone's report by id, which fails goal 1's
  "see only their own".
- **`assignApprovers`** had no owner check and no status check, so any user could rewrite the
  approvers on any report at any status.
- **Staleness measured from `updatedAt`,** which any unrelated write resets.
- **The alert badge** only counted existing alerts and never generated them, so it read zero for a
  newly stale report.

### What I corrected

I fixed the issues that were in scope for that review, but not always the way the review suggested. The transitions became single
`findOneAndUpdate` calls with the preconditions in the filter; `total` moved to `$inc`; staleness got
its own `submittedAt` field; the badge and the list now share one sync function. I also made a point
of checking each claim against the code before acting on it rather than taking the list at face
value — a couple of the smaller items were style opinions rather than defects, and I left those.

## 5. A prompt that produced the wrong answer

Worth recording two, because they were wrong in different ways.

**Over-correcting on delete.** In the review above, the recommendation on the delete endpoint was to
remove it entirely, on the grounds that goal 9 makes the audit trail permanent and deleting a report
deletes its timeline. I took that at first and then decided it was wrong: a report you created by
mistake and never submitted has no history to protect, and forcing it into an archive forever is just
clutter. The rule I actually shipped is narrower and states the real invariant — delete is allowed
only while a report has never been submitted, enforced by `status === 'Draft'` *and*
`submittedAt === null` as clauses in the delete query. That correctly covers the awkward case: a
rejected report is back in `Draft` but carries `submittedAt`, so it cannot be deleted.

**Answering more than was asked.** I asked why error messages weren't appearing on the login screen.
The diagnosis was right and genuinely useful — the axios interceptor treats every 401 as an expired
session, including the one a wrong password returns, so it triggered a full page reload that killed
the toast before it could render. But the answer came back with the whole login component rewritten:
different markup, restructured handlers, changed styling, none of which I'd asked for. I took the
four-line interceptor fix and threw the rest away. It's a good reminder that a correct diagnosis and
an appropriate change are separate things, and that accepting a large diff to get a small fix is how
you end up with code you can't account for.

## 6. Documentation

I used AI to draft these documents from the finished code, then went through each one and cut or
rewrote anything that overstated what's actually in the repo. Every claim here about how something
works is something I can point at in the code and explain.

## On accountability

Every line in this repository is something I've read and can explain, including the parts I didn't
type first. Where I disagreed with generated code I changed it, and the two clearest examples are in
section 5. The most valuable use of AI in this project wasn't producing code — it was being asked
pointed questions about code I'd already written, and then deciding for myself which of the answers
were right.
