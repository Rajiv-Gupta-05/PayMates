const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const User = require('../models/User');
const { computeBalanceMap, sumBalances, simplifyDebts } = require('../utils/balanceCalculator');

// @desc    Get user's overall balance summary
// @route   GET /api/dashboard/summary
// @access  Private
exports.getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    const expenses = await Expense.find({ 'splits.user': userId });
    const settlements = await Settlement.find({
      $or: [{ payer: userId }, { payee: userId }],
    });

    // Use the shared utility to compute per-friend balance map
    const balanceMap = computeBalanceMap(userId, expenses, settlements);
    const { totalOwe, totalOwedToYou, totalBalance } = sumBalances(balanceMap);

    res.json({ totalBalance, youOwe: totalOwe, youAreOwed: totalOwedToYou });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get balance breakdown per friend (who owes what to whom)
// @route   GET /api/dashboard/friends
// @access  Private
exports.getFriendBalances = async (req, res) => {
  try {
    const userId = req.user._id;

    const expenses = await Expense.find({ 'splits.user': userId });
    const settlements = await Settlement.find({
      $or: [{ payer: userId }, { payee: userId }],
    });

    const balanceMap = computeBalanceMap(userId, expenses, settlements);

    // Filter out zero balances and attach user info
    const friendIds = Object.keys(balanceMap).filter(
      (id) => Math.abs(balanceMap[id]) > 0.005
    );

    const friends = await User.find({ _id: { $in: friendIds } }).select('name email');

    const result = friends.map((friend) => ({
      friend: { _id: friend._id, name: friend.name, email: friend.email },
      balance: parseFloat((balanceMap[friend._id.toString()] || 0).toFixed(2)),
      // positive = friend owes you, negative = you owe friend
    }));

    // Sort: people who owe you first, then people you owe
    result.sort((a, b) => b.balance - a.balance);

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get balance summary for a specific group (with simplified debts)
// @route   GET /api/dashboard/group/:groupId
// @access  Private (members only)
exports.getGroupBalanceSummary = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId).populate('members', 'name email');
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some((m) => m._id.toString() === userId.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Fetch all expenses and settlements scoped to this group
    const expenses = await Expense.find({ groupId });
    const settlements = await Settlement.find({ groupId });

    // Build a net balance map for EVERY member (not just the logged-in user)
    // groupBalanceMap[memberId] = net balance across the group
    // positive = this person is owed money overall, negative = this person owes money
    const groupBalanceMap = {};

    group.members.forEach((member) => {
      const memberIdStr = member._id.toString();
      const memberBalanceMap = computeBalanceMap(member._id, expenses, settlements);
      // Sum only balances relevant to group members
      let net = 0;
      Object.entries(memberBalanceMap).forEach(([otherId, bal]) => {
        const otherIsGroupMember = group.members.some((m) => m._id.toString() === otherId);
        if (otherIsGroupMember) net += bal;
      });
      groupBalanceMap[memberIdStr] = parseFloat(net.toFixed(2));
    });

    // Produce the minimum-transactions settlement list
    const rawDebts = simplifyDebts(groupBalanceMap);

    // Attach member names to the simplified debts
    const memberMap = {};
    group.members.forEach((m) => { memberMap[m._id.toString()] = m; });

    const simplifiedDebts = rawDebts.map((d) => ({
      from: memberMap[d.from] ? { _id: memberMap[d.from]._id, name: memberMap[d.from].name } : d.from,
      to: memberMap[d.to] ? { _id: memberMap[d.to]._id, name: memberMap[d.to].name } : d.to,
      amount: d.amount,
    }));

    // Per-member breakdown
    const memberBalances = group.members.map((member) => ({
      user: { _id: member._id, name: member.name, email: member.email },
      netBalance: groupBalanceMap[member._id.toString()] || 0,
    }));

    res.json({
      group: { _id: group._id, name: group.name, type: group.type },
      memberBalances,
      simplifiedDebts,
      yourBalance: groupBalanceMap[userId.toString()] || 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};