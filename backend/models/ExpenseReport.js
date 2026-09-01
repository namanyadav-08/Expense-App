const mongoose = require('mongoose')

const reportSchema = new mongoose.Schema({
  title:             { type: String, required: true, trim: true },
  dateFrom:          { type: Date, required: true },
  dateTo:            { type: Date, required: true },
  status:            { type: String, enum: ['Draft','Submitted','Approved','Rejected','Paid'], default: 'Draft' },
  owner:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedApprovers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  total:             { type: Number, default: 0 },
  rejectionReason:   { type: String },
  isArchived:        { type: Boolean, default: false }
}, { timestamps: true })

module.exports = mongoose.model('ExpenseReport', reportSchema)