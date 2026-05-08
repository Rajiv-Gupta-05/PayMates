const express = require('express');
const router = express.Router();
const { addSettlement, getUserSettlements } = require('../controllers/settlementController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/', protect, addSettlement);      // Settle up
router.get('/', protect, getUserSettlements);  // Get settlement history

module.exports = router;