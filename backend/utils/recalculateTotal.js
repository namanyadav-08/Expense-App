const ExpenseLine   = require('../models/ExpenseLine')
const ExpenseReport = require('../models/ExpenseReport')

const recalculateTotal = async (reportId) => {
  const lines = await ExpenseLine.find({ report: reportId })
  const total = lines.reduce((sum, l) => sum + l.amount, 0)
  await ExpenseReport.findByIdAndUpdate(reportId, { total })
  return total
}

module.exports = recalculateTotal