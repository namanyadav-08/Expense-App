const mongoose = require('mongoose')

const lineSchema = new mongoose.Schema({
  report:      { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseReport', required: true },
  date:        { type: Date, required: true },
  amount:      { type: Number, required: true, min: 0 },
  category:    { type: String, enum: ['Travel','Meals','Accommodation','Supplies','Other'], required: true },
  description: { type: String, required: true, trim: true },
  createdAt:   { type: Date, default: Date.now }
})

module.exports = mongoose.model('ExpenseLine', lineSchema)