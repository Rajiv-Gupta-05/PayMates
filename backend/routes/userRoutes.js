const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateProfile,
  searchUsers,
  addFriend,
  removeFriend,
  getFriends,
} = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/me', protect, getUserProfile);          // Get own profile
router.put('/me', protect, updateProfile);           // Update own profile
router.get('/', protect, searchUsers);               // Search users
router.get('/friends', protect, getFriends);         // Get friends list
router.post('/add-friend', protect, addFriend);      // Add a friend
router.delete('/friends/:friendId', protect, removeFriend); // Remove a friend

module.exports = router;