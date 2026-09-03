const asyncHandler  = require('express-async-handler')
const ExpenseReport = require('../models/ExpenseReport')
const ExpenseLine   = require('../models/ExpenseLine')

const STATUSES = ['Draft', 'Submitted', 'Approved', 'Paid']
const WEEKS     = 8

const startOfWeek = (from = new Date()) => {
  const d = new Date(from)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))   // Monday
  d.setHours(0, 0, 0, 0)
  return d
}

// One code path for both roles: the only difference is the scope filter. Every
// aggregate runs in the database rather than pulling documents in to count them.
const getDashboard = asyncHandler(async (req, res) => {
  const isApprover = req.user.role === 'approver'
  const scope      = isApprover ? {} : { owner: req.user._id }

  const monday     = startOfWeek()
  const chartStart = new Date(monday)
  chartStart.setDate(chartStart.getDate() - (WEEKS - 1) * 7)

  const lineScope = isApprover
    ? {}
    : { report: { $in: await ExpenseReport.find(scope).distinct('_id') } }

  const [statusCounts, dueAgg, totalAgg, approvedThisWeek, paidThisWeek, byCategory, paidRecent] =
    await Promise.all([
      ExpenseReport.aggregate([{ $match: scope }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      ExpenseReport.aggregate([{ $match: { ...scope, status: 'Approved' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      ExpenseReport.aggregate([{ $match: scope }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      ExpenseReport.countDocuments({ ...scope, approvedAt: { $gte: monday } }),
      ExpenseReport.countDocuments({ ...scope, paidAt:     { $gte: monday } }),
      ExpenseLine.aggregate([{ $match: lineScope }, { $group: { _id: '$category', total: { $sum: '$amount' } } }]),
      // Bounded to eight weeks, then bucketed here so the week boundaries match
      // startOfWeek exactly instead of splitting Date maths across two timezones.
      ExpenseReport.find({ ...scope, status: 'Paid', paidAt: { $gte: chartStart } }).select('total paidAt').lean()
    ])

  const counts = Object.fromEntries(statusCounts.map(s => [s._id, s.count]))
  const at = (status) => counts[status] || 0

  const weeklyPaid = []
  for (let i = WEEKS - 1; i >= 0; i--) {
    const start = new Date(monday); start.setDate(start.getDate() - i * 7)
    const end   = new Date(start);  end.setDate(end.getDate() + 7)
    weeklyPaid.push({
      week:  `W${WEEKS - i}`,
      total: paidRecent.filter(r => r.paidAt >= start && r.paidAt < end).reduce((s, r) => s + r.total, 0)
    })
  }

  res.json({
    success: true,
    data: {
      role:             isApprover ? 'approver' : 'employee',
      awaitingApproval: at('Submitted'),
      totalDue:         dueAgg[0]?.total || 0,
      approvedThisWeek,
      paidThisWeek,

      total:         STATUSES.reduce((s, k) => s + at(k), 0),
      draft:         at('Draft'),
      submitted:     at('Submitted'),
      approved:      at('Approved'),
      paid:          at('Paid'),
      totalAmount:   totalAgg[0]?.total || 0,
      pendingAmount: dueAgg[0]?.total   || 0,

      byStatus:   STATUSES.map(status => ({ status, count: at(status) })),
      byCategory: byCategory.map(c => ({ category: c._id, total: c.total })),
      weeklyPaid
    }
  })
})

module.exports = { getDashboard }