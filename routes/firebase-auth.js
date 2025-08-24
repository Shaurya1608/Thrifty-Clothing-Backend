const express = require('express');
const { body, validationResult } = require('express-validator');
const { admin, isFirebaseConfigured } = require('../firebase-admin');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware to verify Firebase token
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    console.error('Firebase token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// @route   POST /api/auth/firebase-user
// @desc    Get user data by Firebase UID
// @access  Public
router.post('/firebase-user', [
  body('firebaseUid').notEmpty().withMessage('Firebase UID is required'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firebaseUid, email } = req.body;

    // Find user by Firebase UID
    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({ message: 'Account is deactivated' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      }
    });

  } catch (error) {
    console.error('Firebase user fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/firebase-register
// @desc    Register user with Firebase UID
// @access  Public
router.post('/firebase-register', [
  body('firebaseUid').notEmpty().withMessage('Firebase UID is required'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('name').notEmpty().withMessage('Name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firebaseUid, email, name } = req.body;

    // Check if user already exists with this email
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // If user exists, check if they have a Firebase UID
      if (existingUser.firebaseUid) {
        // User already exists with Firebase - they should login instead
        return res.status(400).json({ 
          message: 'An account with this email already exists. Please login instead.',
          code: 'EMAIL_EXISTS'
        });
      } else {
        // User exists but without Firebase UID (incomplete registration)
        // Delete the incomplete user and allow fresh registration
        await User.findByIdAndDelete(existingUser._id);
        console.log('Deleted incomplete user registration for:', email);
      }
    }

    // Create new user
    const user = new User({
      firebaseUid,
      email,
      name,
      isEmailVerified: false, // User needs to verify email first
      isActive: true,
      role: 'user'
    });

    await user.save();

    // Create user profile
    const userProfile = new UserProfile({
      userId: user._id,
      firstName: name.split(' ')[0],
      lastName: name.split(' ').slice(1).join(' '),
      phoneNumber: ''
    });
    await userProfile.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      },
      token
    });

  } catch (error) {
    console.error('Firebase registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/firebase-login
// @desc    Login user with Firebase UID
// @access  Public
router.post('/firebase-login', [
  body('firebaseUid').notEmpty().withMessage('Firebase UID is required'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firebaseUid, email } = req.body;

    // Find user by Firebase UID or email
    const user = await User.findOne({ 
      $or: [{ firebaseUid }, { email }] 
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'No account found with this email. Please register first.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({ 
        message: 'Account is deactivated. Please contact support.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // If user exists but doesn't have Firebase UID, they need to register
    if (!user.firebaseUid) {
      return res.status(400).json({ 
        message: 'This email is registered with the old system. Please register again with Firebase.',
        code: 'NEEDS_REGISTRATION'
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({ 
        message: 'Email not verified. Please verify your email before logging in.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      },
      token
    });

  } catch (error) {
    console.error('Firebase login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   POST /api/auth/firebase-user
// @desc    Get user data by Firebase UID
// @access  Public
router.post('/firebase-user', [
  body('firebaseUid').notEmpty().withMessage('Firebase UID is required'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firebaseUid, email } = req.body;

    // Find user by Firebase UID or email
    const user = await User.findOne({ 
      $or: [{ firebaseUid }, { email }] 
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      }
    });

  } catch (error) {
    console.error('Firebase user fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/firebase-verify
// @desc    Verify Firebase token and get user data
// @access  Private
router.post('/firebase-verify', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid, email } = req.firebaseUser;

    // Find user by Firebase UID
    const user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      },
      token
    });

  } catch (error) {
    console.error('Firebase verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify email endpoint
router.post('/verify-email', async (req, res) => {
  try {
    const { firebaseUid, email } = req.body;

    if (!firebaseUid || !email) {
      return res.status(400).json({ message: 'Firebase UID and email are required' });
    }

    // Find and update user to mark as verified
    const user = await User.findOneAndUpdate(
      { firebaseUid },
      { 
        isEmailVerified: true,
        emailVerified: true // Also update the emailVerified field for consistency
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: 'Email verified successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Failed to verify email' });
  }
});

// @route   POST /api/auth/cleanup-incomplete
// @desc    Clean up incomplete registrations
// @access  Public
router.post('/cleanup-incomplete', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Find and delete incomplete registrations (users without Firebase UID)
    const result = await User.deleteMany({ 
      email, 
      firebaseUid: { $exists: false } 
    });

    if (result.deletedCount > 0) {
      console.log(`Cleaned up ${result.deletedCount} incomplete registration(s) for:`, email);
      res.json({ 
        message: 'Incomplete registration cleaned up successfully',
        deletedCount: result.deletedCount
      });
    } else {
      res.json({ 
        message: 'No incomplete registrations found',
        deletedCount: 0
      });
    }

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ message: 'Server error during cleanup' });
  }
});

module.exports = router;

