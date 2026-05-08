const Group = require('../models/Group');

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
exports.createGroup = async (req, res) => {
  try {
    const { name, type, members } = req.body;

    // Ensure the creator is always included in the members array
    let groupMembers = members || [];
    if (!groupMembers.includes(req.user._id.toString())) {
      groupMembers.push(req.user._id.toString());
    }

    const group = await Group.create({
      name,
      type,
      createdBy: req.user._id,
      members: groupMembers
    });

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all groups for the logged-in user
// @route   GET /api/groups
// @access  Private
exports.getGroups = async (req, res) => {
  try {
    // Find groups where the members array contains the logged-in user's ID
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name email') // Replace member IDs with actual user data
      .sort({ createdAt: -1 }); // Newest groups first

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};