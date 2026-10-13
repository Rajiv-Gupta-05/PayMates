const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  expenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: [true, 'Please add a comment text'],
    trim: true,
    maxlength: [500, 'Comment cannot be more than 500 characters']
  }
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);
