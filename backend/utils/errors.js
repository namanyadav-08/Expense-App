class ApiError extends Error {
  constructor (status, message) {
    super(message)
    this.status = status
  }
}

// Compares an ObjectId, a string, or a populated doc against another.
const sameId = (a, b) => String(a?._id || a) === String(b?._id || b)

module.exports = { ApiError, sameId }