const express = require('express');
const router = express.Router();
const {
  createExpense,
  getUserExpenses,
  getGroupExpenses,
  getExpenseById,
  deleteExpense,
} = require('../controllers/expenseController');
const { protect } = require('../middlewares/authMiddleware');

// IMPORTANT: specific routes (/group/:groupId) MUST come before wildcard (/:id)
router.get('/group/:groupId', protect, getGroupExpenses); // Get expenses for a group
router.get('/', protect, getUserExpenses);                // Get all user's expenses
router.get('/:id', protect, getExpenseById);             // Get single expense
router.post('/', protect, createExpense);                 // Create expense
router.delete('/:id', protect, deleteExpense);           // Delete expense

module.exports = router;