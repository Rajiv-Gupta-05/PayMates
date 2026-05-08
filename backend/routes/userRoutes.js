const express = require('express');
const router = express.Router();
const { getUserProfile, searchUsers, addFriend, getFriends } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

// Any route with 'protect' before the controller requires a valid token!
router.get('/me', protect, getUserProfile);
router.get('/', protect, searchUsers);
router.post('/add-friend', protect, addFriend);
router.get('/friends', protect, getFriends);

module.exports = router;