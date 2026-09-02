const express = require('express')
const router  = express.Router()
const { protect } = require('../middleware/authMiddleware')
const { approverOnly } = require('../middleware/roleMiddleware')
const { getAlerts, getAlertCount, dismissAlert } = require('../controllers/alertController')

router.get('/',           protect, approverOnly, getAlerts)
router.get('/count',      protect, approverOnly, getAlertCount)
router.post('/:id/dismiss', protect, approverOnly, dismissAlert)

module.exports = router