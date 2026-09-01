const mongoose      = require('mongoose')
const ExpenseLine   = require('../models/ExpenseLine')
const ExpenseReport = require('../models/ExpenseReport')

// Reconciliation only. The hot path uses $inc in lineController, which is atomic;
// this exists for seeding and for repairing a total if an $inc ever fails mid-write.
const recalculateTotal = async (reportId) => {
  const [agg] = await ExpenseLine.aggregate([
    { $match: { report: new mongoose.Types.ObjectId(String(reportId)) } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ])
  const total = agg?.total || 0
  await ExpenseReport.updateOne({ _id: reportId }, { $set: { total } })
  return total
}

module.exports = recalculateTotal