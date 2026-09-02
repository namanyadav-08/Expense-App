const express = require('express')
const router  = express.Router()
const { protect } = require('../middleware/authMiddleware')
const { approverOnly } = require('../middleware/roleMiddleware')
const {
  getMyReports, createReport, getAllReports, exportCSV, getAssignedToMe,
  getReport, updateReport, submitReport, deleteReport, archiveReport, restoreReport,
  assignApprovers, getHistory, addComment
} = require('../controllers/reportController')

// Literal paths first: '/:id' would otherwise swallow '/all' and the rest.
router.get('/',               protect, getMyReports)
router.post('/',              protect, createReport)
router.get('/all',            protect, getAllReports)             // scoped to the owner for employees
router.get('/export-csv',     protect, approverOnly, exportCSV)
router.get('/assigned-to-me', protect, approverOnly, getAssignedToMe)

router.get('/:id',            protect, getReport)
router.put('/:id',            protect, updateReport)
router.delete('/:id',         protect, deleteReport)              // Draft only; enforced in the controller
router.post('/:id/submit',    protect, submitReport)
router.post('/:id/resubmit',  protect, submitReport)              // rejection returns a report to Draft, so this is a submit
router.post('/:id/archive',   protect, archiveReport)
router.post('/:id/restore',   protect, restoreReport)
router.post('/:id/assign',    protect, assignApprovers)
router.get('/:id/history',    protect, getHistory)
router.post('/:id/comment',   protect, addComment)

module.exports = router