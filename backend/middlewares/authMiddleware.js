const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token from "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];

      // Verify signature and expiry
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Load user from DB (excludes password)
      req.user = await User.findById(decoded.id).select('-password');

      // Guard: token valid but user was deleted from DB
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user account no longer exists' });
      }

      return next(); // ✅ return prevents fall-through to the no-token block
    } catch (error) {
      // Token malformed, expired, or wrong secret
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  // Authorization header missing entirely
  return res.status(401).json({ message: 'Not authorized, no token provided' });
};

module.exports = { protect };