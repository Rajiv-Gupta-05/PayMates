const User = require('../models/User');

exports.getUserProfile = async (req, res) => {
  // Because the middleware already found the user, we can just send req.user back!
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

// @desc    Search for users by email or name (excluding yourself)
// @route   GET /api/users?search=rajiv
// @access  Private
exports.searchUsers = async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } },
        ],
      }
    : {};

  // Find users matching the keyword, BUT exclude the currently logged-in user
  const users = await User.find({ ...keyword, _id: { $ne: req.user._id } }).select('-password');
  res.json(users);
};

// @desc    Add a friend
// @route   POST /api/users/add-friend
// @access  Private
exports.addFriend = async (req, res) => {
  const { friendId } = req.body;

  try {
    const user = await User.findById(req.user._id);
    const friend = await User.findById(friendId);

    if (!friend) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if they are already friends
    if (user.friends.includes(friendId)) {
      return res.status(400).json({ message: 'User is already your friend' });
    }

    // Add friend to user's array (and optionally add user to friend's array)
    user.friends.push(friendId);
    friend.friends.push(user._id); // Makes it a two-way friendship automatically

    await user.save();
    await friend.save();

    res.json({ message: 'Friend added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get logged-in user's friends list
// @route   GET /api/users/friends
// @access  Private
exports.getFriends = async (req, res) => {
  try {
    // .populate() replaces the IDs in the array with the actual user data!
    const user = await User.findById(req.user._id).populate('friends', 'name email');
    res.json(user.friends);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};