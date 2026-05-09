const Group = require('../models/Group');
const User = require('../models/User');

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
exports.createGroup = async (req, res) => {
  try {
    const { name, type, members } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Group name must be at least 2 characters' });
    }

    let groupMembers = Array.isArray(members) ? [...members] : [];

    // Remove duplicates
    groupMembers = [...new Set(groupMembers.map((id) => id.toString()))];

    // ✅ FIX: Validate every member ID exists in the DB
    if (groupMembers.length > 0) {
      const validUsers = await User.find({ _id: { $in: groupMembers } }).select('_id');
      if (validUsers.length !== groupMembers.length) {
        return res.status(400).json({ message: 'One or more member IDs are invalid' });
      }
    }

    // Always include the creator
    const creatorId = req.user._id.toString();
    if (!groupMembers.includes(creatorId)) {
      groupMembers.push(creatorId);
    }

    const group = await Group.create({
      name: name.trim(),
      type: type || 'OTHER',
      createdBy: req.user._id,
      members: groupMembers,
    });

    // ✅ Auto-friend: All group members become friends of each other (Splitwise behavior)
    if (groupMembers.length > 1) {
      const users = await User.find({ _id: { $in: groupMembers } });
      const userMap = {};
      users.forEach(u => { userMap[u._id.toString()] = u; });

      for (let i = 0; i < groupMembers.length; i++) {
        for (let j = i + 1; j < groupMembers.length; j++) {
          const idA = groupMembers[i].toString();
          const idB = groupMembers[j].toString();
          const userA = userMap[idA];
          const userB = userMap[idB];
          if (!userA || !userB) continue;

          const aHasB = userA.friends.map(f => f.toString()).includes(idB);
          if (!aHasB) {
            userA.friends.push(idB);
            userB.friends.push(idA);
          }
        }
      }
      await Promise.all(users.map(u => u.save()));
    }

    const populated = await group.populate('members', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all groups for the logged-in user
// @route   GET /api/groups
// @access  Private
exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get a single group by ID
// @route   GET /api/groups/:id
// @access  Private (members only)
exports.getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Only members can view the group
    const isMember = group.members.some((m) => m._id.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this group' });
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update group name or type (creator only)
// @route   PUT /api/groups/:id
// @access  Private (creator only)
exports.updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the group creator can update it' });
    }

    const { name, type } = req.body;
    if (name) group.name = name.trim();
    if (type) group.type = type;

    await group.save();
    const populated = await group.populate('members', 'name email');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete a group (creator only)
// @route   DELETE /api/groups/:id
// @access  Private (creator only)
exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the group creator can delete it' });
    }

    await group.deleteOne();
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Add a member to a group (creator only)
// @route   POST /api/groups/:id/members
// @access  Private (creator only)
exports.addGroupMember = async (req, res) => {
  try {
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({ message: 'memberId is required' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the group creator can add members' });
    }

    // Validate member exists
    const newMember = await User.findById(memberId);
    if (!newMember) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already a member
    if (group.members.map((m) => m.toString()).includes(memberId)) {
      return res.status(400).json({ message: 'User is already a member of this group' });
    }

    group.members.push(memberId);
    await group.save();

    // ✅ Auto-friend: new member becomes friends with all existing members
    const existingMemberIds = group.members.map(m => m.toString()).filter(id => id !== memberId);
    if (existingMemberIds.length > 0) {
      const usersToUpdate = await User.find({
        _id: { $in: [...existingMemberIds, memberId] }
      });
      const userMap = {};
      usersToUpdate.forEach(u => { userMap[u._id.toString()] = u; });

      const newMemberUser = userMap[memberId];
      if (newMemberUser) {
        for (const existingId of existingMemberIds) {
          const existingUser = userMap[existingId];
          if (!existingUser) continue;
          const alreadyFriends = newMemberUser.friends.map(f => f.toString()).includes(existingId);
          if (!alreadyFriends) {
            newMemberUser.friends.push(existingId);
            existingUser.friends.push(memberId);
          }
        }
        await Promise.all(usersToUpdate.map(u => u.save()));
      }
    }

    const populated = await group.populate('members', 'name email');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Remove a member from a group (creator only, cannot remove creator)
// @route   DELETE /api/groups/:id/members/:memberId
// @access  Private (creator only)
exports.removeGroupMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the group creator can remove members' });
    }

    if (memberId === group.createdBy.toString()) {
      return res.status(400).json({ message: 'Cannot remove the group creator' });
    }

    const wasMember = group.members.map((m) => m.toString()).includes(memberId);
    if (!wasMember) {
      return res.status(400).json({ message: 'User is not a member of this group' });
    }

    group.members = group.members.filter((m) => m.toString() !== memberId);
    await group.save();

    const populated = await group.populate('members', 'name email');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};