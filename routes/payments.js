const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// @route   POST /api/payments
// @desc    Process payment
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    res.json({ message: 'Payments endpoint' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

