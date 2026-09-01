const mongoose = require('mongoose')

const alertSchema = new mongoose.Schema({
  report:      { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseReport', required: true },
  approver:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dismissedAt: { type: Date, default: null },
  createdAt:   { type: Date, default: Date.now }
})

// One alert per (report, approver). The unique index is what makes the upsert in
// alertController safe against two concurrent requests creating duplicates.
alertSchema.index({ report: 1, approver: 1 }, { unique: true })
alertSchema.index({ approver: 1, dismissedAt: 1 })

module.exports = mongoose.model('Alert', alertSchema)