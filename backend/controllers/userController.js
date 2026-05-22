const User = require('../models/User');

// @desc    Get logged-in user's profile
// @route   GET /api/users/me
// @access  Private
exports.getUserProfile = async (req, res) => {
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

// @desc    Update logged-in user's profile
// @route   PUT /api/users/me
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;
    if (req.body.avatar !== undefined) {
      user.avatar = req.body.avatar;
    }

    // if password was sent, update it
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      avatar: updatedUser.avatar,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Search for users by name or email (excluding yourself)
// @route   GET /api/users?search=query
// @access  Private
exports.searchUsers = async (req, res) => {
  try {
    const keyword = req.query.search
      ? {
          $or: [
            { name: { $regex: req.query.search.trim(), $options: 'i' } },
            { email: { $regex: req.query.search.trim(), $options: 'i' } },
            { phone: { $regex: req.query.search.trim(), $options: 'i' } },
          ],
        }
      : {};

    const users = await User.find({
      ...keyword,
      _id: { $ne: req.user._id },
    }).select('-password');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Add a friend (bidirectional, duplicate-safe)
// @route   POST /api/users/add-friend
// @access  Private
exports.addFriend = async (req, res) => {
  try {
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ message: 'friendId is required' });
    }

    // Cannot add yourself
    if (friendId === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot add yourself as a friend' });
    }

    const user = await User.findById(req.user._id);
    const friend = await User.findById(friendId);

    if (!friend) {
      return res.status(404).json({ message: 'User not found' });
    }

    // ✅ FIX: Check BOTH directions to prevent duplicate entries
    const alreadyFriends =
      user.friends.map((id) => id.toString()).includes(friendId) ||
      friend.friends.map((id) => id.toString()).includes(user._id.toString());

    if (alreadyFriends) {
      return res.status(400).json({ message: 'You are already friends with this user' });
    }

    // Bidirectional friendship
    user.friends.push(friendId);
    friend.friends.push(user._id);

    await user.save();
    await friend.save();

    res.json({ message: 'Friend added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Remove a friend (bidirectional)
// @route   DELETE /api/users/friends/:friendId
// @access  Private
exports.removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;

    if (friendId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    const user = await User.findById(req.user._id);
    const friend = await User.findById(friendId);

    if (!friend) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isFriend = user.friends.map((id) => id.toString()).includes(friendId);
    if (!isFriend) {
      return res.status(400).json({ message: 'This user is not in your friends list' });
    }

    // Remove from both sides
    user.friends = user.friends.filter((id) => id.toString() !== friendId);
    friend.friends = friend.friends.filter((id) => id.toString() !== req.user._id.toString());

    await user.save();
    await friend.save();

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get logged-in user's friends list
// @route   GET /api/users/friends
// @access  Private
exports.getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('friends', 'name email phone avatar');
    res.json(user.friends);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};