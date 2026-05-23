const Expense = require('../models/Expense');
const Group = require('../models/Group');
const Notification = require('../models/Notification');

// @desc    Create a new expense
// @route   POST /api/expenses
// @access  Private
exports.createExpense = async (req, res) => {
  try {
    const { description, totalAmount, groupId, splits, category } = req.body;

    // --- Input validation ---
    if (!description || description.trim().length === 0) {
      return res.status(400).json({ message: 'Description is required' });
    }
    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ message: 'Total amount must be a positive number' });
    }
    if (!splits || !Array.isArray(splits) || splits.length === 0) {
      return res.status(400).json({ message: 'At least one split entry is required' });
    }

    // Validate each split entry
    for (const split of splits) {
      if (!split.user) {
        return res.status(400).json({ message: 'Each split must have a user ID' });
      }
      if (split.amountPaid == null || split.amountPaid < 0) {
        return res.status(400).json({ message: 'amountPaid cannot be negative' });
      }
      if (split.amountOwed == null || split.amountOwed < 0) {
        return res.status(400).json({ message: 'amountOwed cannot be negative' });
      }
    }

    // Validate split math
    let calculatedTotalPaid = 0;
    let calculatedTotalOwed = 0;
    splits.forEach((split) => {
      calculatedTotalPaid += split.amountPaid;
      calculatedTotalOwed += split.amountOwed;
    });

    if (Math.abs(calculatedTotalPaid - totalAmount) > 0.01) {
      return res.status(400).json({ message: `amountPaid across all splits must equal totalAmount (got ${calculatedTotalPaid.toFixed(2)}, expected ${totalAmount})` });
    }
    if (Math.abs(calculatedTotalOwed - totalAmount) > 0.01) {
      return res.status(400).json({ message: `amountOwed across all splits must equal totalAmount (got ${calculatedTotalOwed.toFixed(2)}, expected ${totalAmount})` });
    }

    // If groupId provided, validate user is a member of that group
    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      const isMember = group.members.map((m) => m.toString()).includes(req.user._id.toString());
      if (!isMember) {
        return res.status(403).json({ message: 'You are not a member of this group' });
      }
    }

    const expense = await Expense.create({
      description: description.trim(),
      totalAmount,
      groupId: groupId || null,
      category: category || 'OTHER',
      createdBy: req.user._id,
      splits,
    });

    const populated = await Expense.findById(expense._id)
      .populate('createdBy', 'name email')
      .populate('splits.user', 'name email')
      .populate('groupId', 'name');

    // Create notifications for everyone involved in the split (except the creator)
    const notificationPromises = splits
      .filter(split => split.user.toString() !== req.user._id.toString())
      .map(split => {
        return Notification.create({
          recipient: split.user,
          sender: req.user._id,
          type: groupId ? 'group_expense_add' : 'expense_add',
          entityId: expense._id,
          message: `${req.user.name} added an expense: "${expense.description}"`
        });
      });
    
    if (notificationPromises.length > 0) {
      await Promise.all(notificationPromises).catch(err => console.error("Notification Error:", err));
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update an existing expense
// @route   PUT /api/expenses/:id
// @access  Private
exports.updateExpense = async (req, res) => {
  try {
    const { description, totalAmount, groupId, splits, category } = req.body;
    const expenseId = req.params.id;

    let expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Ensure the user is either the creator or involved in the splits
    const isCreator = expense.createdBy.toString() === req.user._id.toString();
    const isInvolved = expense.splits.some(s => s.user.toString() === req.user._id.toString());
    
    if (!isCreator && !isInvolved) {
      return res.status(403).json({ message: 'Not authorized to edit this expense' });
    }

    // --- Input validation ---
    if (!description || description.trim().length === 0) {
      return res.status(400).json({ message: 'Description is required' });
    }
    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ message: 'Total amount must be a positive number' });
    }
    if (!splits || !Array.isArray(splits) || splits.length === 0) {
      return res.status(400).json({ message: 'At least one split entry is required' });
    }

    let calculatedTotalPaid = 0;
    let calculatedTotalOwed = 0;
    splits.forEach((split) => {
      calculatedTotalPaid += split.amountPaid;
      calculatedTotalOwed += split.amountOwed;
    });

    if (Math.abs(calculatedTotalPaid - totalAmount) > 0.01) {
      return res.status(400).json({ message: 'amountPaid across all splits must equal totalAmount' });
    }
    if (Math.abs(calculatedTotalOwed - totalAmount) > 0.01) {
      return res.status(400).json({ message: 'amountOwed across all splits must equal totalAmount' });
    }

    expense.description = description.trim();
    expense.totalAmount = totalAmount;
    expense.groupId = groupId || null;
    expense.category = category || expense.category;
    expense.splits = splits;

    await expense.save();

    const populated = await Expense.findById(expense._id)
      .populate('createdBy', 'name email')
      .populate('splits.user', 'name email')
      .populate('groupId', 'name');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all expenses involving the logged-in user
// @route   GET /api/expenses
// @access  Private
exports.getUserExpenses = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find groups the user is a member of
    const userGroups = await Group.find({ members: userId }).select('_id');
    const groupIds = userGroups.map(g => g._id);

    // Fetch:
    // 1. Expenses where user is directly in splits (personal + group expenses they're split into)
    // 2. Expenses from any group the user belongs to (see others' expenses in shared groups)
    const expenses = await Expense.find({
      $or: [
        { 'splits.user': userId },
        { groupId: { $in: groupIds } }
      ]
    })
      .populate('createdBy', 'name email')
      .populate('splits.user', 'name email')
      .populate('groupId', 'name')
      .sort({ createdAt: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all expenses for a specific group
// @route   GET /api/expenses/group/:groupId
// @access  Private (members only)
exports.getGroupExpenses = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.map((m) => m.toString()).includes(req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    const expenses = await Expense.find({ groupId: req.params.groupId })
      .populate('createdBy', 'name email')
      .populate('splits.user', 'name email')
      .sort({ createdAt: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get a single expense by ID
// @route   GET /api/expenses/:id
// @access  Private (involved users only)
exports.getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('splits.user', 'name email')
      .populate('groupId', 'name');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Only users involved in the expense can view it
    const isInvolved = expense.splits.some(
      (s) => s.user._id.toString() === req.user._id.toString()
    );
    if (!isInvolved && expense.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete an expense (creator only)
// @route   DELETE /api/expenses/:id
// @access  Private (creator only)
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the person who created this expense can delete it' });
    }

    await expense.deleteOne();
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};