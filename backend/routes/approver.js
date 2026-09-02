const express = require('express')
const router  = express.Router()
const { protect } = require('../middleware/authMiddleware')
const { approverOnly } = require('../middleware/roleMiddleware')
const { approve, reject, markPaid, bulkAction } = require('../controllers/approverController')

router.post('/bulk-action',   protect, approverOnly, bulkAction)
router.post('/:id/approve',   protect, approverOnly, approve)
router.post('/:id/reject',    protect, approverOnly, reject)
router.post('/:id/paid',      protect, approverOnly, markPaid)

module.exports = router