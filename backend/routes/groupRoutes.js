const express = require('express');
const router = express.Router();
const { createGroup, getGroups } = require('../controllers/groupController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/', protect, createGroup); // Create group
router.get('/', protect, getGroups);    // Get user's groups

module.exports = router;