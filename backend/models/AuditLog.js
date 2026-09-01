const mongoose = require('mongoose')

// Append-only by construction: nothing in the app exposes an update or delete path.
const auditSchema = new mongoose.Schema({
  report:    { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseReport', required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, enum: ['status_change', 'comment'], required: true },
  oldStatus: String,
  newStatus: String,
  reason:    String,
  comment:   String,
  createdAt: { type: Date, default: Date.now }
})

auditSchema.index({ report: 1, createdAt: 1 })

module.exports = mongoose.model('AuditLog', auditSchema)