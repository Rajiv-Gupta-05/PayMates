const Expense = require('../models/Expense');

// @desc    Add a new expense
// @route   POST /api/expenses
// @access  Private
exports.createExpense = async (req, res) => {
  try {
    const { description, totalAmount, groupId, splits } = req.body;

    // 1. Validation: Ensure the math adds up!
    let calculatedTotalPaid = 0;
    let calculatedTotalOwed = 0;

    splits.forEach(split => {
      calculatedTotalPaid += split.amountPaid;
      calculatedTotalOwed += split.amountOwed;
    });

    // We use Math.abs to handle tiny javascript decimal rounding errors
    if (Math.abs(calculatedTotalPaid - totalAmount) > 0.01 || Math.abs(calculatedTotalOwed - totalAmount) > 0.01) {
      return res.status(400).json({ message: 'Amounts do not add up to the total bill.' });
    }

    // 2. Create the expense
    const expense = await Expense.create({
      description,
      totalAmount,
      groupId: groupId || null,
      createdBy: req.user._id,
      splits
    });

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all expenses involving the logged-in user
// @route   GET /api/expenses
// @access  Private
exports.getUserExpenses = async (req, res) => {
  try {
    // Find expenses where the logged-in user's ID exists inside the splits array
    const expenses = await Expense.find({ 'splits.user': req.user._id })
      .populate('createdBy', 'name')
      .populate('splits.user', 'name')
      .populate('groupId', 'name')
      .sort({ createdAt: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};