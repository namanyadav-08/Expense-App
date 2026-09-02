const asyncHandler  = require('express-async-handler')
const Alert         = require('../models/Alert')
const ExpenseReport = require('../models/ExpenseReport')
const { ApiError, sameId } = require('../utils/errors')

const days = (n) => n * 86400000
const staleDays   = () => parseInt(process.env.STALE_DAYS)    || 3
const reAlertDays = () => parseInt(process.env.RE_ALERT_DAYS) || 2

// Brings this approver's alerts in line with reality. Both the list and the badge
// count call it, so a newly stale report raises the badge without anyone first
// having to open the alerts page.
const syncAlerts = async (approverId) => {
  const staleBefore   = new Date(Date.now() - days(staleDays()))
  const reAlertBefore = new Date(Date.now() - days(reAlertDays()))

  // Staleness is time spent in Submitted, measured from submittedAt. updatedAt would
  // be reset by any unrelated write to the report.
  const stale = await ExpenseReport.find({
    status: 'Submitted',
    isArchived: false,
    assignedApprovers: approverId,
    submittedAt: { $ne: null, $lt: staleBefore }
  }).select('_id').lean()

  if (!stale.length) return []
  const reportIds = stale.map(r => r._id)

  // Upsert rather than findOne-then-create: the unique index on (report, approver)
  // makes concurrent requests converge on one alert instead of duplicating it.
  for (const reportId of reportIds) {
    try {
      await Alert.updateOne(
        { report: reportId, approver: approverId },
        { $setOnInsert: { report: reportId, approver: approverId, createdAt: new Date() } },
        { upsert: true }
      )
    } catch (err) {
      if (err.code !== 11000) throw err   // lost the upsert race; the alert exists, which is the goal
    }
  }

  // A dismissed alert comes back if the report is still undecided reAlertDays later.
  await Alert.updateMany(
    { approver: approverId, report: { $in: reportIds }, dismissedAt: { $ne: null, $lt: reAlertBefore } },
    { $set: { dismissedAt: null } }
  )

  return reportIds
}

const getAlerts = asyncHandler(async (req, res) => {
  await syncAlerts(req.user._id)

  const alerts = await Alert.find({ approver: req.user._id, dismissedAt: null })
    .populate({ path: 'report', populate: { path: 'owner', select: 'name email' } })
    .sort({ createdAt: 1 })

  // Defensive: an alert whose report has since been decided or deleted is not shown.
  res.json({ success: true, data: alerts.filter(a => a.report?.status === 'Submitted') })
})

const getAlertCount = asyncHandler(async (req, res) => {
  await syncAlerts(req.user._id)
  const count = await Alert.countDocuments({ approver: req.user._id, dismissedAt: null })
  res.json({ success: true, data: { count } })
})

const dismissAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.id)
  if (!alert) throw new ApiError(404, 'Alert not found')
  if (!sameId(alert.approver, req.user._id))
    throw new ApiError(403, 'This alert belongs to another approver')

  alert.dismissedAt = new Date()
  await alert.save()
  res.json({ success: true, data: alert })
})

module.exports = { getAlerts, getAlertCount, dismissAlert }