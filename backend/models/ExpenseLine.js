const mongoose = require('mongoose')

const lineSchema = new mongoose.Schema({
  report:      { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseReport', required: true, index: true },
  date:        { type: Date, required: true },
  amount:      { type: Number, required: true, min: 0 },
  category:    { type: String, enum: ['Travel', 'Meals', 'Accommodation', 'Supplies', 'Other'], required: true },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  createdAt:   { type: Date, default: Date.now }
})

lineSchema.index({ category: 1 })  // dashboard breakdown by category
lineSchema.index({ report: 1 })    // for fetching all lines of a specific report

module.exports = mongoose.model('ExpenseLine', lineSchema)