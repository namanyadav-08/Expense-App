const jwt  = require('jsonwebtoken')
const User = require('../models/User')

const protect = async (req, res, next) => {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Not authorized, no token' })

  let decoded
  try {
    decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' })
  }

  // A valid token for a deleted user is still not a valid session.
  const user = await User.findById(decoded.id)
  if (!user) return res.status(401).json({ success: false, message: 'Account no longer exists' })

  req.user = user
  next()
}

module.exports = { protect }