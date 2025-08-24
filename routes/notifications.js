const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    res.json({ message: 'Notifications endpoint' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

