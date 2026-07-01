const mongoose = require('mongoose');
const { createTenantModelProxy } = require('../utils/tenantContext');

const expenseSchema = new mongoose.Schema({
  gymId: {
    type: String,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Please add an amount']
  },
  category: {
    type: String,
    required: [true, 'Please select a category'],
    enum: ['Rent', 'Salary', 'Utilities', 'Equipment', 'Maintenance', 'Other']
  },
  date: {
    type: Date,
    default: Date.now
  },
  note: {
    type: String,
    trim: true
  },
  isReminder: {
    type: Boolean,
    default: false
  },
  dueDate: {
    type: Date
  },
  reminderDate: {
    type: Date
  },
  billImage: {
    type: String
  }
}, {
  timestamps: true
});

expenseSchema.index({ date: -1 });

const Expense = createTenantModelProxy('Expense', expenseSchema);
Expense.schema = expenseSchema;

module.exports = Expense;

