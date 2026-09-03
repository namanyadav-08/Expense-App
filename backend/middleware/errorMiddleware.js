const { ApiError } = require('../utils/errors')

const notFound = (req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` })

// Maps the error types this app actually produces onto real status codes.
// Everything unrecognised is a bug, so it logs and returns an opaque 500.
const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError)
    return res.status(err.status).json({ success: false, message: err.message })

  if (err.name === 'CastError')
    return res.status(400).json({ success: false, message: `Malformed id '${err.value}'` })

  if (err.name === 'ValidationError')
    return res.status(400).json({ success: false, message: Object.values(err.errors).map(e => e.message).join('; ') })

  if (err.code === 11000)
    return res.status(409).json({ success: false, message: `Duplicate value for ${Object.keys(err.keyValue).join(', ')}` })

  console.error(err)
  res.status(500).json({ success: false, message: 'Internal server error' })
}

module.exports = { notFound, errorHandler }