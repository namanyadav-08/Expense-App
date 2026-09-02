const asyncHandler  = require('express-async-handler')
const ExpenseReport = require('../models/ExpenseReport')
const ExpenseLine   = require('../models/ExpenseLine')
const AuditLog      = require('../models/AuditLog')
const Alert         = require('../models/Alert')
const User          = require('../models/User')
const { Parser }    = require('json2csv')
const { ApiError, sameId } = require('../utils/errors')
const { loadOwnedReport, assertCanView } = require('../utils/reportAccess')

// The only fields a client may ever set. status, total, owner, isArchived and the
// transition timestamps are server-owned; spreading req.body would hand them over.
const EDITABLE = ['title', 'dateFrom', 'dateTo']
const pickReportInput = (body) => Object.fromEntries(
  EDITABLE.filter(f => body[f] !== undefined).map(f => [f, body[f]])
)

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const getMyReports = asyncHandler(async (req, res) => {
  const reports = await ExpenseReport
    .find({ owner: req.user._id, isArchived: req.query.archived === 'true' })
    .populate('owner assignedApprovers', 'name email')
    .sort({ createdAt: -1 })
    .lean()
  res.json({ success: true, data: reports })
})

const createReport = asyncHandler(async (req, res) => {
  const report = await ExpenseReport.create({ ...pickReportInput(req.body), owner: req.user._id })
  res.status(201).json({ success: true, data: report })
})

// One list endpoint for both roles. Employees are scoped to their own reports on the
// server; the filtering, sorting and paging all run in the database.
const getAllReports = asyncHandler(async (req, res) => {
  const isApprover = req.user.role === 'approver'
  const q = { isArchived: req.query.archived === 'true' }

  if (!isApprover) q.owner = req.user._id
  else if (req.query.owner) q.owner = req.query.owner

  if (req.query.search)   q.title = { $regex: escapeRegex(req.query.search), $options: 'i' }
  if (req.query.status)   q.status = req.query.status
  if (req.query.approver) q.assignedApprovers = req.query.approver

  const page  = Math.max(parseInt(req.query.page) || 1, 1)
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100)

  const sortMap = {
    date:   { submittedAt: -1, createdAt: -1 },
    status: { status: 1, createdAt: -1 },
    total:  { total: -1 }
  }
  const sort = sortMap[req.query.sort] || { createdAt: -1 }

  const [reports, total] = await Promise.all([
    ExpenseReport.find(q)
      .populate('owner assignedApprovers', 'name email')
      .sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    ExpenseReport.countDocuments(q)
  ])

  // Filter facets are effectively a user directory, so only approvers get them.
  const [owners, approvers] = isApprover
    ? await Promise.all([
        User.find().select('name email role').lean(),
        User.find({ role: 'approver' }).select('name email').lean()
      ])
    : [[], []]

  res.json({
    success: true,
    data: { reports, total, page, pages: Math.ceil(total / limit) || 1, owners, approvers }
  })
})

// Reimbursements due: approved but not yet paid.
const exportCSV = asyncHandler(async (req, res) => {
  const reports = await ExpenseReport.find({ status: 'Approved' })
    .populate('owner', 'name email').sort({ approvedAt: 1 }).lean()

  const rows = reports.map(r => ({
    id:         String(r._id),
    title:      r.title,
    owner:      r.owner?.name  || 'Unknown',
    ownerEmail: r.owner?.email || '',
    periodFrom: r.dateFrom?.toISOString().slice(0, 10),
    periodTo:   r.dateTo?.toISOString().slice(0, 10),
    approvedAt: r.approvedAt?.toISOString().slice(0, 10) || '',
    total:      r.total
  }))

  const fields = ['id', 'title', 'owner', 'ownerEmail', 'periodFrom', 'periodTo', 'approvedAt', 'total']
  const csv = new Parser({ fields }).parse(rows)
  res.header('Content-Type', 'text/csv').attachment('reimbursements-due.csv').send(csv)
})

const getAssignedToMe = asyncHandler(async (req, res) => {
  const reports = await ExpenseReport
    .find({ assignedApprovers: req.user._id, status: 'Submitted', isArchived: false })
    .populate('owner', 'name email')
    .sort({ submittedAt: 1 })
    .lean()
  res.json({ success: true, data: reports })
})

const getReport = asyncHandler(async (req, res) => {
  const report = await ExpenseReport.findById(req.params.id).populate('owner assignedApprovers', 'name email')
  if (!report) throw new ApiError(404, 'Report not found')
  assertCanView(report, req.user)

  const [lines, history] = await Promise.all([
    ExpenseLine.find({ report: report._id }).sort({ date: 1 }).lean(),
    AuditLog.find({ report: report._id }).populate('changedBy', 'name email').sort({ createdAt: 1 }).lean()
  ])
  res.json({ success: true, data: { report, lines, history } })
})

const updateReport = asyncHandler(async (req, res) => {
  const report = await loadOwnedReport(req.params.id, req.user, 'Draft')
  Object.assign(report, pickReportInput(req.body))
  await report.save()
  res.json({ success: true, data: report })
})

const submitReport = asyncHandler(async (req, res) => {
  const report = await loadOwnedReport(req.params.id, req.user, 'Draft')
  if (!await ExpenseLine.countDocuments({ report: report._id }))
    throw new ApiError(400, 'Add at least one expense line before submitting')

  // Guarded on Draft so two concurrent submits produce one transition and one audit row.
  const updated = await ExpenseReport.findOneAndUpdate(
    { _id: report._id, status: 'Draft' },
    { $set: { status: 'Submitted', submittedAt: new Date(), rejectionReason: null } },
    { new: true }
  )
  if (!updated) throw new ApiError(409, 'Report is no longer in Draft; reload and try again')

  await AuditLog.create({
    report: report._id, changedBy: req.user._id,
    type: 'status_change', oldStatus: 'Draft', newStatus: 'Submitted'
  })
  res.json({ success: true, data: updated })
})

// Hard delete, and only for a report that has never been submitted. Once it has
// entered the approval flow it is on the record permanently — rejected reports
// included, since those are back in Draft but already have a timeline.
// submittedAt is the marker: set on submit, never cleared.
const deleteReport = asyncHandler(async (req, res) => {
  const report = await loadOwnedReport(req.params.id, req.user, 'Draft')
  if (report.submittedAt)
    throw new ApiError(409, 'This report has already been submitted once and cannot be deleted. Archive it instead.')

  // Status and submittedAt are both clauses here, so a submit landing between the
  // check above and this write means the delete matches nothing rather than
  // destroying a report that is now in an approver's queue.
  const { deletedCount } = await ExpenseReport.deleteOne({
    _id: req.params.id, status: 'Draft', submittedAt: null
  })
  if (!deletedCount)
    throw new ApiError(409, 'The report was submitted a moment ago and can no longer be deleted')

  // Parent first: orphaned children are invisible, whereas a surviving report whose
  // lines were removed would show a total that matches nothing.
  await Promise.all([
    ExpenseLine.deleteMany({ report: req.params.id }),
    AuditLog.deleteMany({ report: req.params.id }),
    Alert.deleteMany({ report: req.params.id })
  ])

  res.json({ success: true, data: {} })
})


const setArchived = (value) => asyncHandler(async (req, res) => {
  const report = await loadOwnedReport(req.params.id, req.user)
  report.isArchived = value
  await report.save()
  res.json({ success: true, data: report })
})

const assignApprovers = asyncHandler(async (req, res) => {
  const report = await loadOwnedReport(req.params.id, req.user)
  if (['Approved', 'Paid'].includes(report.status))
    throw new ApiError(409, `Approvers cannot be changed once a report is ${report.status}`)

  const ids = [...new Set((req.body.approvers || []).map(String))]
  if (ids.some(id => sameId(id, req.user._id)))
    throw new ApiError(400, 'You cannot assign yourself as an approver of your own report')

  const valid = await User.find({ _id: { $in: ids }, role: 'approver' }).select('_id').lean()
  if (valid.length !== ids.length)
    throw new ApiError(400, 'One or more selected users are not approvers')

  report.assignedApprovers = ids
  await report.save()
  res.json({ success: true, data: report })
})

const getHistory = asyncHandler(async (req, res) => {
  const report = await ExpenseReport.findById(req.params.id).select('owner').lean()
  if (!report) throw new ApiError(404, 'Report not found')
  assertCanView(report, req.user)

  const history = await AuditLog.find({ report: req.params.id })
    .populate('changedBy', 'name email').sort({ createdAt: 1 }).lean()
  res.json({ success: true, data: history })
})

const addComment = asyncHandler(async (req, res) => {
  const comment = (req.body.comment || '').trim()
  if (!comment) throw new ApiError(400, 'Comment cannot be empty')

  const report = await ExpenseReport.findById(req.params.id).select('owner').lean()
  if (!report) throw new ApiError(404, 'Report not found')
  assertCanView(report, req.user)

  const log = await AuditLog.create({
    report: req.params.id, changedBy: req.user._id, type: 'comment', comment
  })
  res.status(201).json({ success: true, data: await log.populate('changedBy', 'name email') })
})


module.exports = {
  getMyReports, createReport, getAllReports, exportCSV, getAssignedToMe,
  getReport, updateReport, submitReport, deleteReport,
  archiveReport: setArchived(true), restoreReport: setArchived(false),
  assignApprovers, getHistory, addComment
}