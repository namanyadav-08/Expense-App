const approverOnly = (req, res, next) => {
  if (req.user?.role !== 'approver')
    return res.status(403).json({ success: false, message: 'Approver role required' })
  next()
}

module.exports = { approverOnly }