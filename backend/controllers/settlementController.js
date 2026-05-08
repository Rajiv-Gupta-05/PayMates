const Settlement = require('../models/Settlement');

// @desc    Record a payment / Settle up
// @route   POST /api/settlements
// @access  Private
exports.addSettlement = async (req, res) => {
  try {
    // Now we accept BOTH the payer and payee from the frontend
    const { payerId, payeeId, amount, groupId } = req.body;

    // Security check: The logged-in user MUST be either the payer or the payee
    if (req.user._id.toString() !== payerId && req.user._id.toString() !== payeeId) {
      return res.status(403).json({ message: 'You can only record settlements you are involved in.' });
    }

    // Prevent settling with yourself
    if (payerId === payeeId) {
      return res.status(400).json({ message: 'You cannot settle up with yourself.' });
    }

    const settlement = await Settlement.create({
      payer: payerId,
      payee: payeeId,
      amount,
      groupId: groupId || null
    });

    res.status(201).json(settlement);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all settlements involving the logged-in user (either as payer or payee)
// @route   GET /api/settlements
// @access  Private
exports.getUserSettlements = async (req, res) => {
  try {
    // Find settlements where the user is EITHER the payer OR the payee
    const settlements = await Settlement.find({
      $or: [{ payer: req.user._id }, { payee: req.user._id }]
    })
      .populate('payer', 'name email')
      .populate('payee', 'name email')
      .populate('groupId', 'name')
      .sort({ createdAt: -1 });

    res.json(settlements);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};