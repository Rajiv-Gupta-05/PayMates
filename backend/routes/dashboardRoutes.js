const express = require('express');
const router = express.Router();
const {
  getDashboardSummary,
  getFriendBalances,
  getGroupBalanceSummary,
} = require('../controllers/dashboardController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/summary', protect, getDashboardSummary);            // Overall totals
router.get('/friends', protect, getFriendBalances);              // Per-friend breakdown
router.get('/group/:groupId', protect, getGroupBalanceSummary);  // Per-group breakdown + simplified debts

module.exports = router;