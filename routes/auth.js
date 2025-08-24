const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const auth = require('../middleware/auth');
const sendEmail = require('../utils/email');
const sendSMS = require('../utils/sms');

const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d'
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('phone').optional().isMobilePhone('en-IN').withMessage('Please provide a valid phone number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone, gender, dateOfBirth } = req.body;

    // Check if user already exists and is fully verified
    let user = await User.findOne({ email });
    if (user && user.isEmailVerified) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // If user exists but email is not verified, allow re-registration
    if (user && !user.isEmailVerified) {
      console.log('🔄 Allowing re-registration for unverified user:', email);
      // Delete the existing unverified user
      await User.deleteOne({ email });
      console.log('✅ Deleted unverified user for re-registration');
    }

    if (phone) {
      user = await User.findOne({ phone });
      if (user && user.isEmailVerified) {
        return res.status(400).json({ message: 'User already exists with this phone number' });
      }
      
      // If user exists with phone but email is not verified, allow re-registration
      if (user && !user.isEmailVerified) {
        console.log('🔄 Allowing re-registration for unverified user with phone:', phone);
        await User.deleteOne({ phone });
        console.log('✅ Deleted unverified user with phone for re-registration');
      }
    }

    // Create new user (email not verified initially)
    user = new User({
      name,
      email,
      password,
      phone,
      gender,
      dateOfBirth,
      isEmailVerified: false // Email verification required
    });

    await user.save();

    // Generate and send email verification OTP
    try {
      const otp = user.generateEmailOTP();
      await user.save();

      // Send verification email with OTP
      await sendEmail({
        to: email,
        template: 'email-verification',
        data: {
          name: name,
          otp: otp
        }
      });

      // Create user profile
      const userProfile = new UserProfile({
        userId: user._id,
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' '),
        gender: gender,
        dateOfBirth: dateOfBirth,
        phoneNumber: phone
      });
      await userProfile.save();

      res.json({
        message: 'Registration successful! Please check your email for verification code.',
        requiresVerification: true,
        email: email
      });

    } catch (emailError) {
      console.error('Email verification error:', emailError);
      
      // If email fails, still create the account but inform user
      const userProfile = new UserProfile({
        userId: user._id,
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' '),
        gender: gender,
        dateOfBirth: dateOfBirth,
        phoneNumber: phone
      });
      await userProfile.save();

      res.json({
        message: 'Registration successful! However, we could not send verification email. Please contact support.',
        requiresVerification: false,
        email: email
      });
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({ message: 'Account is deactivated' });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(400).json({ 
        message: 'Please verify your email address before logging in',
        requiresVerification: true,
        email: user.email
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify email with OTP
// @access  Public
router.post('/verify-email', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Verify OTP
    const isValid = user.verifyEmailOTP(otp);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({
      message: 'Email verified successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error during email verification' });
  }
});

// @route   POST /api/auth/verify-phone
// @desc    Verify phone with OTP
// @access  Public
router.post('/verify-phone', [
  body('phone').isMobilePhone('en-IN').withMessage('Please provide a valid phone number'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, otp } = req.body;

    const user = await User.findOne({ phone, phoneVerificationToken: otp });
    if (!user) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    user.isPhoneVerified = true;
    user.phoneVerificationToken = undefined;
    await user.save();

    res.json({ message: 'Phone verified successfully' });

  } catch (error) {
    console.error('Phone verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/resend-otp
// @desc    Resend OTP to email
// @access  Public
router.post('/resend-otp', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found with this email' });
    }

    // Check if user is already verified
    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new OTP
    const otp = user.generateEmailOTP();
    await user.save();

    // Send email with OTP
    await sendEmail({
      to: email,
      template: 'email-verification',
      data: {
        name: user.name,
        otp: otp
      }
    });

    res.json({ message: 'OTP sent successfully' });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/resend-phone-otp
// @desc    Resend OTP to phone
// @access  Public
router.post('/resend-phone-otp', [
  body('phone').isMobilePhone('en-IN').withMessage('Please provide a valid phone number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ message: 'User not found with this phone number' });
    }

    // Generate new OTP
    const phoneToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.phoneVerificationToken = phoneToken;
    await user.save();

    // Send SMS
    await sendSMS({
      to: phone,
      message: `Your THRIFTY CLOTHINGS verification code is: ${phoneToken}`
    });

    res.json({ message: 'OTP sent successfully' });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found with this email' });
    }

    // Generate reset token
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset email
    await sendEmail({
      to: email,
      subject: 'Reset your password - THRIFTY CLOTHINGS',
      template: 'password-reset',
      data: { 
        name: user.name, 
        token: resetToken,
        resetLink: `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`
      }
    });

    res.json({ message: 'Password reset email sent' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/refresh-token
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh-token', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const newToken = generateToken(user._id);
    res.json({ 
      message: 'Token refreshed successfully',
      token: newToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Error refreshing token' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Public (no auth required for logout)
router.post('/logout', (req, res) => {
  // Just return success - actual logout is handled on frontend
  res.json({ message: 'Logged out successfully' });
});

// @route   POST /api/auth/reset-password-simple
// @desc    Reset password for existing user (temporary route for testing)
// @access  Public
router.post('/reset-password-simple', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found with this email' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now login with your new password.' });

  } catch (error) {
    console.error('Simple password reset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/check-user
// @desc    Check if user exists (temporary route for testing)
// @access  Public
router.get('/check-user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email }).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ 
      message: 'User found',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Check user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change password for logged in user
// @access  Private
router.post('/change-password', auth, [
  body('currentPassword').exists().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/validate-token
// @desc    Validate JWT token and return user data
// @access  Private
router.get('/validate-token', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
