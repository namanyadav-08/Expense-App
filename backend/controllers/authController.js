const asyncHandler = require('express-async-handler')
const jwt          = require('jsonwebtoken')
const User         = require('../models/User')
const { ApiError } = require('../utils/errors')

const genToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })

const publicUser = (u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role })

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body
  if (!['employee', 'approver'].includes(role || 'employee'))
    throw new ApiError(400, 'Role must be employee or approver')

  // The pre-check is a nicety; the unique index on email is the actual guarantee,
  // and a duplicate that slips through the gap surfaces as a 409 from the error handler.
  if (await User.findOne({ email })) throw new ApiError(409, 'Email already registered')

  const user = await User.create({ name, email, password, role })
  res.status(201).json({ success: true, data: { token: genToken(user._id), user: publicUser(user) } })
})

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email }).select('+password')
  if (!user || !(await user.matchPassword(password)))
    throw new ApiError(401, 'Invalid credentials')

  res.json({ success: true, data: { token: genToken(user._id), user: publicUser(user) } })
})

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: publicUser(req.user) })
})

// Approvers a report can be assigned to. The caller is excluded because they can
// never decide on a report they own, so offering them is a dead end.
const listApprovers = asyncHandler(async (req, res) => {
  const approvers = await User.find({ role: 'approver', _id: { $ne: req.user._id } })
    .select('name email').lean()
  res.json({ success: true, data: approvers })
})

module.exports = { register, login, me, listApprovers }