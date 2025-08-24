const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// @route   GET /api/cart
// @desc    Get user cart
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    res.json({ message: 'Cart endpoint' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

