const Notification = require('../models/Notification');

// Get all notifications for the current user
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(50); // Fetch latest 50 notifications
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching notifications.' });
  }
};

// Mark all unread notifications as read
exports.markAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.json({ message: 'Notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error marking notifications as read.' });
  }
};
