const express = require('express');
const router = express.Router();
const { createExpense, getUserExpenses } = require('../controllers/expenseController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/', protect, createExpense);      // Create an expense
router.get('/', protect, getUserExpenses);     // Get all user's expenses

module.exports = router;