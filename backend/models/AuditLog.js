const mongoose = require('mongoose')

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

module.exports = mongoose.model('AuditLog', auditSchema)