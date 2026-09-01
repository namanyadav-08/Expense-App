const mongoose = require('mongoose')

const alertSchema = new mongoose.Schema({
  report:           { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseReport', required: true },
  approver:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dismissedAt:      { type: Date, default: null },
  reAlertAfterDays: { type: Number, default: 2 },
  createdAt:        { type: Date, default: Date.now }
})

module.exports = mongoose.model('Alert', alertSchema)