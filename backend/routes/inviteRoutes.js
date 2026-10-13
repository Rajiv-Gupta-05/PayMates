const express = require('express');
const router = express.Router();
const { sendInvite } = require('../controllers/inviteController');
const { protect } = require('../middlewares/authMiddleware');

// POST /api/invite — Send an invite via email or phone
router.post('/', protect, sendInvite);

module.exports = router;
