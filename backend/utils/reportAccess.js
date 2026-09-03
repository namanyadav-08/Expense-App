const ExpenseReport = require('../models/ExpenseReport')
const { ApiError, sameId } = require('./errors')

// Loads a report the caller owns, optionally asserting its current status.
// Throws rather than writing to res, so callers read as a straight sequence.
const loadOwnedReport = async (reportId, user, requiredStatus) => {
  const report = await ExpenseReport.findById(reportId)
  if (!report) throw new ApiError(404, 'Report not found')
  if (!sameId(report.owner, user._id)) throw new ApiError(403, 'This report belongs to another employee')
  if (requiredStatus && report.status !== requiredStatus)
    throw new ApiError(409, `A report in '${report.status}' status cannot be changed; it must be in '${requiredStatus}'`)
  return report
}

// Employees see only their own reports. Approvers see everyone's.
const assertCanView = (report, user) => {
  if (user.role !== 'approver' && !sameId(report.owner, user._id))
    throw new ApiError(403, 'This report belongs to another employee')
}

module.exports = { loadOwnedReport, assertCanView }