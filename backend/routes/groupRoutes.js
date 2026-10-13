const express = require('express');
const router = express.Router();
const {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
} = require('../controllers/groupController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/', protect, createGroup);                              // Create group
router.get('/', protect, getGroups);                                 // Get all user's groups
router.get('/:id', protect, getGroupById);                          // Get group by ID
router.put('/:id', protect, updateGroup);                           // Update group
router.delete('/:id', protect, deleteGroup);                        // Delete group
router.post('/:id/members', protect, addGroupMember);               // Add member
router.delete('/:id/members/:memberId', protect, removeGroupMember); // Remove member

module.exports = router;