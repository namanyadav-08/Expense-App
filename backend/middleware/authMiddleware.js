const jwt = require('jsonwebtoken')
const User = require('../models/User')

const protect = async (req, res, next) => {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Not authorized, no token' })

  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET)
    req.user = await User.findById(decoded.id)
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Token invalid' })
  }
}

module.exports = { protect }