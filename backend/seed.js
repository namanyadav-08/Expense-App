const mongoose = require('mongoose')
const dotenv   = require('dotenv')
dotenv.config()

const User          = require('./models/User')
const ExpenseReport = require('./models/ExpenseReport')
const ExpenseLine   = require('./models/ExpenseLine')
const AuditLog      = require('./models/AuditLog')
const Alert         = require('./models/Alert')

// --- Relative date helpers -------------------------------------------------
// Everything is anchored to "now" so the demo never ages. Running this in any
// month produces reports whose periods, submissions and payments all sit in the
// recent past relative to the day it was seeded.
const DAY = 86400000
const daysAgo   = (n) => new Date(Date.now() - n * DAY)
// First and last day of the month `n` months before the current one.
const monthStart = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n, 1);  d.setHours(0, 0, 0, 0); return d }
const monthEnd   = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n + 1, 0); d.setHours(0, 0, 0, 0); return d }
// A date `dayOffset` days into the month `n` months ago — used for line dates so
// each line falls inside its own report's period.
const dayInMonth = (n, dayOffset) => { const d = monthStart(n); d.setDate(d.getDate() + dayOffset); return d }

// Create lines for a report and set its total from their sum in one place, so a
// report's stored total can never drift from the lines that justify it.
const addLinesAndTotal = async (reportId, items) => {
  await ExpenseLine.create(items.map(i => ({ report: reportId, ...i })))
  const total = items.reduce((s, i) => s + i.amount, 0)
  await ExpenseReport.findByIdAndUpdate(reportId, { total })
  return total
}

const run = async () => {
  if (!process.env.MONGO_URI) { console.error('MONGO_URI is not set'); process.exit(1) }

  await mongoose.connect(process.env.MONGO_URI)
  await Promise.all([User, ExpenseReport, ExpenseLine, AuditLog, Alert].map(m => m.deleteMany({})))

  const [alice, bob, carol, dave] = await User.create([
    { name: 'Alice Employee', email: 'alice@demo.com', password: 'demo1234', role: 'employee' },
    { name: 'Bob Employee',   email: 'bob@demo.com',   password: 'demo1234', role: 'employee' },
    { name: 'Carol Approver', email: 'carol@demo.com', password: 'demo1234', role: 'approver' },
    { name: 'Dave Approver',  email: 'dave@demo.com',  password: 'demo1234', role: 'approver' }
  ])

  // --- 3 Draft reports (Alice) — never submitted, so these are the deletable ones
  for (let i = 1; i <= 3; i++) {
    const r = await ExpenseReport.create({
      title: `Draft Report ${i}`, dateFrom: monthStart(0), dateTo: monthEnd(0), owner: alice._id
    })
    await addLinesAndTotal(r._id, [
      { date: dayInMonth(0, 4), amount: 1200, category: 'Travel',        description: 'Flight tickets' },
      { date: dayInMonth(0, 5), amount: 450,  category: 'Meals',         description: 'Team dinner' },
      { date: dayInMonth(0, 6), amount: 3000, category: 'Accommodation', description: 'Hotel 3 nights' }
    ])
  }

  // --- 4 Submitted reports awaiting a decision (submitted yesterday)
  const submittedData = [
    { title: 'Q1 Travel',   owner: alice._id, approvers: [carol._id] },
    { title: 'Q2 Supplies', owner: bob._id,   approvers: [carol._id] },
    { title: 'Jul Meals',   owner: alice._id, approvers: [dave._id]  },
    { title: 'Aug Trip',    owner: bob._id,   approvers: [dave._id]  }
  ]
  for (const d of submittedData) {
    const r = await ExpenseReport.create({
      title: d.title, dateFrom: monthStart(1), dateTo: monthEnd(1),
      owner: d.owner, assignedApprovers: d.approvers, status: 'Submitted', submittedAt: daysAgo(1)
    })
    await addLinesAndTotal(r._id, [
      { date: dayInMonth(1, 9),  amount: 5000, category: 'Travel',   description: 'Business trip' },
      { date: dayInMonth(1, 10), amount: 800,  category: 'Supplies', description: 'Office supplies' }
    ])
    await AuditLog.create({ report: r._id, changedBy: d.owner, type: 'status_change', oldStatus: 'Draft', newStatus: 'Submitted', createdAt: daysAgo(1) })
  }

  // --- 3 Approved reports — these are the reimbursements due (CSV export)
  for (let i = 1; i <= 3; i++) {
    const r = await ExpenseReport.create({
      title: `Approved Report ${i}`, dateFrom: monthStart(2), dateTo: monthEnd(2),
      owner: alice._id, assignedApprovers: [carol._id], status: 'Approved',
      submittedAt: daysAgo(10), approvedAt: daysAgo(i)
    })
    await addLinesAndTotal(r._id, [{ date: dayInMonth(2, 14), amount: 7000 * i, category: 'Accommodation', description: 'Hotel stay' }])
    await AuditLog.create({ report: r._id, changedBy: carol._id, type: 'status_change', oldStatus: 'Submitted', newStatus: 'Approved', createdAt: daysAgo(i) })
  }

  // --- 4 Paid reports, spread a week apart so the 8-week chart has multiple bars
  for (let i = 1; i <= 4; i++) {
    const r = await ExpenseReport.create({
      title: `Paid Report ${i}`, dateFrom: monthStart(3), dateTo: monthEnd(3),
      owner: bob._id, assignedApprovers: [dave._id], status: 'Paid',
      submittedAt: daysAgo(i * 7 + 5), approvedAt: daysAgo(i * 7 + 2), paidAt: daysAgo(i * 7)
    })
    await addLinesAndTotal(r._id, [{ date: dayInMonth(3, 9), amount: 4500 * i, category: 'Other', description: 'Misc expenses' }])
    await AuditLog.create({ report: r._id, changedBy: dave._id, type: 'status_change', oldStatus: 'Approved', newStatus: 'Paid', createdAt: daysAgo(i * 7) })
  }

  // --- 1 Rejected report: back in Draft with the reason attached, but submittedAt
  // is set — it has been through the flow, so its owner can edit and resubmit it
  // but cannot delete it. This is what exercises the rejected-state UI.
  const rej = await ExpenseReport.create({
    title: 'Rejected Report', dateFrom: monthStart(4), dateTo: monthEnd(4),
    owner: alice._id, assignedApprovers: [carol._id], status: 'Draft',
    submittedAt: daysAgo(12), rejectionReason: 'Missing receipts'
  })
  await addLinesAndTotal(rej._id, [{ date: dayInMonth(4, 4), amount: 2000, category: 'Meals', description: 'Client lunch' }])
  await AuditLog.create({ report: rej._id, changedBy: alice._id, type: 'status_change', oldStatus: 'Draft', newStatus: 'Submitted', createdAt: daysAgo(12) })
  await AuditLog.create({ report: rej._id, changedBy: carol._id, type: 'status_change', oldStatus: 'Submitted', newStatus: 'Draft', reason: 'Missing receipts', createdAt: daysAgo(11) })
  await AuditLog.create({ report: rej._id, changedBy: carol._id, type: 'comment', comment: 'Please attach the hotel invoice and resubmit.', createdAt: daysAgo(11) })

  // --- 1 Stale submitted report: submitted 6 days ago, past STALE_DAYS (default 3),
  // so it raises an alert for Carol.
  const staleDate = daysAgo(6)
  const stale = await ExpenseReport.create({
    title: 'Stale Report', dateFrom: monthStart(1), dateTo: monthEnd(1),
    owner: bob._id, assignedApprovers: [carol._id], status: 'Submitted', submittedAt: staleDate
  })
  await addLinesAndTotal(stale._id, [{ date: dayInMonth(1, 1), amount: 1500, category: 'Travel', description: 'Taxi' }])
  await AuditLog.create({ report: stale._id, changedBy: bob._id, type: 'status_change', oldStatus: 'Draft', newStatus: 'Submitted', createdAt: staleDate })

  // --- 2 Approver-owned reports: an approver is also an employee for their own
  // expenses. These demonstrate the self-approval rule from both sides.
  //
  //   1. Self-assigned  — Carol owns it and is the only assigned approver. She
  //      cannot approve or reject her own report; the controls are blocked server-side.
  //   2. Cross-assigned — Carol owns it, Dave is assigned. The correct routing:
  //      another approver handles a report its owner happens to be an approver of.
  const carolSelf = await ExpenseReport.create({
    title: "Carol's Own Expenses (self-assigned)", dateFrom: monthStart(1), dateTo: monthEnd(1),
    owner: carol._id, assignedApprovers: [carol._id], status: 'Submitted', submittedAt: daysAgo(2)
  })
  await addLinesAndTotal(carolSelf._id, [
    { date: dayInMonth(1, 6), amount: 2200, category: 'Travel', description: 'Conference travel' },
    { date: dayInMonth(1, 7), amount: 900,  category: 'Meals',  description: 'Conference meals' }
  ])
  await AuditLog.create({ report: carolSelf._id, changedBy: carol._id, type: 'status_change', oldStatus: 'Draft', newStatus: 'Submitted', createdAt: daysAgo(2) })

  const carolCross = await ExpenseReport.create({
    title: "Carol's Own Expenses (routed to Dave)", dateFrom: monthStart(1), dateTo: monthEnd(1),
    owner: carol._id, assignedApprovers: [dave._id], status: 'Submitted', submittedAt: daysAgo(2)
  })
  await addLinesAndTotal(carolCross._id, [
    { date: dayInMonth(1, 8), amount: 1800, category: 'Supplies', description: 'Team equipment' }
  ])
  await AuditLog.create({ report: carolCross._id, changedBy: carol._id, type: 'status_change', oldStatus: 'Draft', newStatus: 'Submitted', createdAt: daysAgo(2) })

  console.log('Seed complete! Employees: alice@demo.com / bob@demo.com — Approvers: carol@demo.com / dave@demo.com — password demo1234')
  process.exit()
}

run().catch(e => { console.error(e); process.exit(1) })