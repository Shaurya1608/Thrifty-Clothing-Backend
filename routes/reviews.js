const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// @route   GET /api/reviews
// @desc    Get reviews
// @access  Public
router.get('/', async (req, res) => {
  try {
    res.json({ message: 'Reviews endpoint' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

