const asyncHandler  = require('express-async-handler')
const ExpenseReport = require('../models/ExpenseReport')
const AuditLog      = require('../models/AuditLog')
const Alert         = require('../models/Alert')
const { ApiError, sameId } = require('../utils/errors')

const BULK_LIMIT = 100

// The update matched nothing. Re-read to say why, so callers get a real reason
// rather than a bare 404 — this is also what the bulk response reports per report.
const explainMiss = async (reportId, approver, requiredStatus) => {
  const report = await ExpenseReport.findById(reportId).select('status owner title').lean()
  if (!report) return { status: 404, message: 'Report not found', title: null }
  if (sameId(report.owner, approver._id))
    return { status: 403, message: 'You cannot decide on your own report', title: report.title }
  return {
    status: 409,
    message: `Report is in '${report.status}' status, not '${requiredStatus}'`,
    title: report.title
  }
}

// Every precondition — existence, current status, and not owning the report — is a
// clause in one findOneAndUpdate. Two approvers racing on the same report means one
// atomic write wins and the other is told why it lost, instead of both writing.
const decide = async ({ reportId, approver, action, reason }) => {
  const now = new Date()

  // Rejection sends the report back to Draft, but submittedAt is deliberately left
  // in place: it is the permanent record that this report has been through the
  // approval flow, and it is what stops the owner deleting it afterwards.
  const change = action === 'approve'
    ? { status: 'Approved', approvedAt: now }
    : { status: 'Draft', rejectionReason: reason }

  const report = await ExpenseReport.findOneAndUpdate(
    { _id: reportId, status: 'Submitted', owner: { $ne: approver._id } },
    { $set: change },
    { new: true }
  )
  if (!report) return { ok: false, ...(await explainMiss(reportId, approver, 'Submitted')) }

  await AuditLog.create({
    report:    report._id,
    changedBy: approver._id,
    type:      'status_change',
    oldStatus: 'Submitted',
    newStatus: report.status,
    reason:    action === 'reject' ? reason : undefined
  })
  // The report is no longer awaiting a decision, so its stale alerts are spent.
  await Alert.deleteMany({ report: report._id })

  return { ok: true, report }
}

const requireReason = (reason) => {
  const trimmed = (reason || '').trim()
  if (!trimmed) throw new ApiError(400, 'A reason is required when rejecting a report')
  return trimmed
}

const approve = asyncHandler(async (req, res) => {
  const result = await decide({ reportId: req.params.id, approver: req.user, action: 'approve' })
  if (!result.ok) throw new ApiError(result.status, result.message)
  res.json({ success: true, data: result.report })
})

// Rejection sends the report back to Draft with the reason attached, so its owner
// can fix it and submit again. The reason is preserved on the report and in the log.
const reject = asyncHandler(async (req, res) => {
  const reason = requireReason(req.body.reason)
  const result = await decide({ reportId: req.params.id, approver: req.user, action: 'reject', reason })
  if (!result.ok) throw new ApiError(result.status, result.message)
  res.json({ success: true, data: result.report })
})

const markPaid = asyncHandler(async (req, res) => {
  const report = await ExpenseReport.findOneAndUpdate(
    { _id: req.params.id, status: 'Approved', owner: { $ne: req.user._id } },
    { $set: { status: 'Paid', paidAt: new Date() } },
    { new: true }
  )
  if (!report) {
    const miss = await explainMiss(req.params.id, req.user, 'Approved')
    throw new ApiError(miss.status, miss.message)
  }

  await AuditLog.create({
    report: report._id, changedBy: req.user._id,
    type: 'status_change', oldStatus: 'Approved', newStatus: 'Paid'
  })
  res.json({ success: true, data: report })
})

// Each report is checked and written independently, so one refusal never blocks the
// rest. The per-report result names exactly why anything was refused, including the
// approver owning a report in their own selection.
const bulkAction = asyncHandler(async (req, res) => {
  const { reportIds, action } = req.body

  if (!Array.isArray(reportIds) || !reportIds.length)
    throw new ApiError(400, 'Select at least one report')
  if (reportIds.length > BULK_LIMIT)
    throw new ApiError(400, `Select at most ${BULK_LIMIT} reports at a time`)
  if (!['approve', 'reject'].includes(action))
    throw new ApiError(400, "Action must be 'approve' or 'reject'")

  const reason = action === 'reject' ? requireReason(req.body.reason) : undefined

  const results = []
  for (const id of [...new Set(reportIds.map(String))]) {
    try {
      const outcome = await decide({ reportId: id, approver: req.user, action, reason })
      results.push(outcome.ok
        ? { reportId: id, title: outcome.report.title, success: true, action }
        : { reportId: id, title: outcome.title, success: false, reason: outcome.message,
            selfOwned: outcome.status === 403 })
    } catch (err) {
      results.push({ reportId: id, success: false, reason: err.message, selfOwned: false })
    }
  }

  const succeeded = results.filter(r => r.success).length
  res.json({
    success: true,
    data: {
      total:     results.length,
      succeeded,
      failed:    results.length - succeeded,
      selfOwned: results.filter(r => r.selfOwned).map(r => r.title || r.reportId),
      results
    }
  })
})

module.exports = { approve, reject, markPaid, bulkAction }