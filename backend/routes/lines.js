const express = require('express')
const router  = express.Router()
const { protect } = require('../middleware/authMiddleware')
const { addLine, updateLine, deleteLine } = require('../controllers/lineController')

router.post('/:id/lines',            protect, addLine)
router.put('/:id/lines/:lineId',     protect, updateLine)
router.delete('/:id/lines/:lineId',  protect, deleteLine)

module.exports = router