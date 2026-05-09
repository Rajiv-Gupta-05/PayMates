const express = require('express');
const router = express.Router();
const {
  addSettlement,
  getUserSettlements,
  getGroupSettlements,
} = require('../controllers/settlementController');
const { protect } = require('../middlewares/authMiddleware');

// Specific route before wildcard
router.get('/group/:groupId', protect, getGroupSettlements); // Get settlements for a group
router.post('/', protect, addSettlement);                    // Record a settlement
router.get('/', protect, getUserSettlements);                // Get all user's settlements

module.exports = router;