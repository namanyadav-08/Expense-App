const mongoose = require('mongoose')

const reportSchema = new mongoose.Schema({
  title:             { type: String, required: true, trim: true, maxlength: 120 },
  dateFrom:          { type: Date, required: true },
  dateTo:            { type: Date, required: true },
  status:            { type: String, enum: ['Draft', 'Submitted', 'Approved', 'Paid'], default: 'Draft' },
  owner:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedApprovers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Server-owned. Maintained by $inc from the line controller; never accepted from the client.
  total:             { type: Number, default: 0, min: 0 },

  rejectionReason:   { type: String, default: null },
  isArchived:        { type: Boolean, default: false },

  // Explicit transition timestamps. updatedAt is not usable for this: any unrelated
  // write moves it, which silently reset the staleness clock and the weekly charts.
  submittedAt:       { type: Date, default: null },
  approvedAt:        { type: Date, default: null },
  paidAt:            { type: Date, default: null }
}, { timestamps: true })

reportSchema.pre('validate', function (next) {
  if (this.dateFrom && this.dateTo && this.dateTo < this.dateFrom)
    return next(new Error('dateTo must be on or after dateFrom'))
  next()
})

reportSchema.index({ isArchived: 1, status: 1, submittedAt: -1 })  // approver queue and /all
reportSchema.index({ owner: 1, isArchived: 1, createdAt: -1 })     // my reports
reportSchema.index({ assignedApprovers: 1, status: 1 })            // assigned-to-me and alerts
reportSchema.index({ paidAt: -1 })                                 // dashboard weekly chart
reportSchema.index({ approvedAt: -1 })

module.exports = mongoose.model('ExpenseReport', reportSchema)