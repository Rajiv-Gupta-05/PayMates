const mongoose = require('mongoose');

const splitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amountPaid: {
    type: Number,
    required: true,
    default: 0
  },
  amountOwed: {
    type: Number,
    required: true
  }
});

const expenseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  totalAmount: {
    type: Number,
    required: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null // Null means it's a direct expense between friends, not in a group
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  splits: [splitSchema]
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);