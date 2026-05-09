const Settlement = require('../models/Settlement');
const Group = require('../models/Group');

// @desc    Record a payment / settle up
// @route   POST /api/settlements
// @access  Private
exports.addSettlement = async (req, res) => {
  try {
    const { payerId, payeeId, amount, groupId, note } = req.body;

    // --- Input validation ---
    if (!payerId || !payeeId) {
      return res.status(400).json({ message: 'payerId and payeeId are required' });
    }

    // ✅ FIX: Validate amount is a positive number
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Settlement amount must be greater than zero' });
    }

    // Prevent settling with yourself
    if (payerId === payeeId) {
      return res.status(400).json({ message: 'You cannot settle up with yourself' });
    }

    // Security check: logged-in user must be either payer or payee
    const userId = req.user._id.toString();
    if (userId !== payerId && userId !== payeeId) {
      return res.status(403).json({ message: 'You can only record settlements you are directly involved in' });
    }

    // If groupId provided, validate group exists and both users are members
    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      const memberIds = group.members.map((m) => m.toString());
      if (!memberIds.includes(payerId) || !memberIds.includes(payeeId)) {
        return res.status(400).json({ message: 'Both payer and payee must be members of the group' });
      }
    }

    const settlement = await Settlement.create({
      payer: payerId,
      payee: payeeId,
      amount,
      groupId: groupId || null,
      note: note || '',
    });

    const populated = await Settlement.findById(settlement._id)
      .populate('payer', 'name email')
      .populate('payee', 'name email')
      .populate('groupId', 'name');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all settlements involving the logged-in user
// @route   GET /api/settlements
// @access  Private
exports.getUserSettlements = async (req, res) => {
  try {
    const settlements = await Settlement.find({
      $or: [{ payer: req.user._id }, { payee: req.user._id }],
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

// @desc    Get all settlements for a specific group
// @route   GET /api/settlements/group/:groupId
// @access  Private (members only)
exports.getGroupSettlements = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.map((m) => m.toString()).includes(req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    const settlements = await Settlement.find({ groupId: req.params.groupId })
      .populate('payer', 'name email')
      .populate('payee', 'name email')
      .sort({ createdAt: -1 });

    res.json(settlements);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};