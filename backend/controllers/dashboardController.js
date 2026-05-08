const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');

// @desc    Get user's overall balance summary
// @route   GET /api/dashboard/summary
// @access  Private
exports.getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Fetch all expenses the user is involved in
    const expenses = await Expense.find({ 'splits.user': userId });

    // 2. Fetch all settlements involving the user
    const settlements = await Settlement.find({
      $or: [{ payer: userId }, { payee: userId }]
    });

    let totalOwe = 0;
    let totalOwedToYou = 0;

    // --- CRUNCH THE EXPENSES ---
    expenses.forEach(expense => {
      // Find the user's specific split inside this expense
      const mySplit = expense.splits.find(split => split.user.toString() === userId.toString());
      
      if (mySplit) {
        // Net for this expense = What I paid minus What I was supposed to pay
        const net = mySplit.amountPaid - mySplit.amountOwed;
        
        if (net > 0) {
          totalOwedToYou += net; // I paid more than my share, people owe me
        } else if (net < 0) {
          totalOwe += Math.abs(net); // I paid less than my share, I owe people
        }
      }
    });

    // --- CRUNCH THE SETTLEMENTS (PAYMENTS) ---
    settlements.forEach(settlement => {
      if (settlement.payer.toString() === userId.toString()) {
        // I paid someone back, so my debt goes down (subtract from totalOwe)
        totalOwe -= settlement.amount;
      } else if (settlement.payee.toString() === userId.toString()) {
        // Someone paid me back, so what people owe me goes down
        totalOwedToYou -= settlement.amount;
      }
    });

    // Handle any negative numbers that might occur from overpaying
    if (totalOwe < 0) {
        totalOwedToYou += Math.abs(totalOwe);
        totalOwe = 0;
    }
    if (totalOwedToYou < 0) {
        totalOwe += Math.abs(totalOwedToYou);
        totalOwedToYou = 0;
    }

    // Calculate the absolute total balance
    const totalBalance = totalOwedToYou - totalOwe;

    res.json({
      totalBalance: parseFloat(totalBalance.toFixed(2)),
      youOwe: parseFloat(totalOwe.toFixed(2)),
      youAreOwed: parseFloat(totalOwedToYou.toFixed(2))
    });

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};