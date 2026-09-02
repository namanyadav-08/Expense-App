const express = require('express')
const router  = express.Router()
const { protect } = require('../middleware/authMiddleware')
const { register, login, me, listApprovers } = require('../controllers/authController')

router.post('/register',  register)
router.post('/login',     login)
router.get('/me',         protect, me)
router.get('/approvers',  protect, listApprovers)

module.exports = router