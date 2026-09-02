const asyncHandler  = require('express-async-handler')
const ExpenseLine   = require('../models/ExpenseLine')
const ExpenseReport = require('../models/ExpenseReport')
const { ApiError }  = require('../utils/errors')
const { loadOwnedReport } = require('../utils/reportAccess')

const LINE_FIELDS = ['date', 'amount', 'category', 'description']
const pickLineInput = (body) => Object.fromEntries(
  LINE_FIELDS.filter(f => body[f] !== undefined).map(f => [f, body[f]])
)

// Applies a delta to the report total, but only while it is still a Draft.
// $inc is atomic per document, so concurrent line edits add up instead of
// overwriting each other the way a read-sum-write would. The status guard closes
// the window between the ownership check and this write, where a submit can land.
const applyDelta = async (reportId, delta) => {
  const { matchedCount } = await ExpenseReport.updateOne(
    { _id: reportId, status: 'Draft' },
    { $inc: { total: delta } }
  )
  return matchedCount === 1
}

const addLine = asyncHandler(async (req, res) => {
  const report = await loadOwnedReport(req.params.id, req.user, 'Draft')
  const line = await ExpenseLine.create({ ...pickLineInput(req.body), report: report._id })

  if (!await applyDelta(report._id, line.amount)) {
    await line.deleteOne()
    throw new ApiError(409, 'The report was submitted while you were editing; the line was not saved')
  }
  res.status(201).json({ success: true, data: line })
})

const updateLine = asyncHandler(async (req, res) => {
  const report = await loadOwnedReport(req.params.id, req.user, 'Draft')
  const line = await ExpenseLine.findOne({ _id: req.params.lineId, report: report._id })
  if (!line) throw new ApiError(404, 'Expense line not found on this report')

  const previousAmount = line.amount
  Object.assign(line, pickLineInput(req.body))
  await line.save()

  if (!await applyDelta(report._id, line.amount - previousAmount)) {
    line.amount = previousAmount
    await line.save()
    throw new ApiError(409, 'The report was submitted while you were editing; the change was not saved')
  }
  res.json({ success: true, data: line })
})

const deleteLine = asyncHandler(async (req, res) => {
  const report = await loadOwnedReport(req.params.id, req.user, 'Draft')
  const line = await ExpenseLine.findOne({ _id: req.params.lineId, report: report._id })
  if (!line) throw new ApiError(404, 'Expense line not found on this report')

  // Take the total down first: if the report has just been submitted this fails
  // and the line survives, which is the safer of the two ways to lose the race.
  if (!await applyDelta(report._id, -line.amount))
    throw new ApiError(409, 'The report was submitted while you were editing; the line was not removed')

  await line.deleteOne()
  res.json({ success: true, data: {} })
})

module.exports = { addLine, updateLine, deleteLine }