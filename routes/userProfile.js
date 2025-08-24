const express = require('express');
const router = express.Router();
const UserProfile = require('../models/UserProfile');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    let profile = await UserProfile.findOne({ userId: req.user.id }).populate('userId', 'email name');
    
    if (!profile) {
      // Create profile if it doesn't exist
      profile = new UserProfile({
        userId: req.user.id
      });
      await profile.save();
    }
    
    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, [
  body('firstName').optional().trim().isLength({ max: 50 }),
  body('lastName').optional().trim().isLength({ max: 50 }),
  body('dateOfBirth').optional().isISO8601(),
  body('gender').optional().isIn(['male', 'female', 'other', 'prefer-not-to-say']),
  body('phoneNumber').optional().trim(),
  body('preferences.emailNotifications').optional().isBoolean(),
  body('preferences.smsNotifications').optional().isBoolean(),
  body('preferences.newsletter').optional().isBoolean(),
  body('preferences.sizePreference').optional().isIn(['XS', 'S', 'M', 'L', 'XL', 'XXL']),
  body('preferences.favoriteCategories').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let profile = await UserProfile.findOne({ userId: req.user.id });
    
    if (!profile) {
      profile = new UserProfile({ userId: req.user.id });
    }

    // Update fields
    const updateFields = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'phoneNumber'];
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        profile[field] = req.body[field];
      }
    });

    // Update preferences
    if (req.body.preferences) {
      Object.keys(req.body.preferences).forEach(key => {
        if (req.body.preferences[key] !== undefined) {
          profile.preferences[key] = req.body.preferences[key];
        }
      });
    }

    await profile.save();
    res.json(profile);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get addresses
router.get('/addresses', auth, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.user.id });
    if (!profile) {
      return res.json([]);
    }
    res.json(profile.addresses || []);
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add address
router.post('/addresses', auth, [
  body('type').isIn(['home', 'work', 'other']),
  body('street').notEmpty().trim(),
  body('city').notEmpty().trim(),
  body('state').notEmpty().trim(),
  body('zipCode').notEmpty().trim(),
  body('country').optional().trim(),
  body('isDefault').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let profile = await UserProfile.findOne({ userId: req.user.id });
    if (!profile) {
      profile = new UserProfile({ userId: req.user.id });
    }

    // If this is the first address, make it default
    if (profile.addresses.length === 0) {
      req.body.isDefault = true;
    }

    // If setting as default, unset other defaults
    if (req.body.isDefault) {
      profile.addresses.forEach(addr => addr.isDefault = false);
    }

    profile.addresses.push(req.body);
    await profile.save();

    res.json(profile.addresses[profile.addresses.length - 1]);
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update address
router.put('/addresses/:addressId', auth, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.user.id });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const address = profile.addresses.id(req.params.addressId);
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // Update address fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        address[key] = req.body[key];
      }
    });

    // If setting as default, unset other defaults
    if (req.body.isDefault) {
      profile.addresses.forEach(addr => {
        if (addr._id.toString() !== req.params.addressId) {
          addr.isDefault = false;
        }
      });
    }

    await profile.save();
    res.json(address);
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete address
router.delete('/addresses/:addressId', auth, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.user.id });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const address = profile.addresses.id(req.params.addressId);
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    address.remove();
    await profile.save();

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get wishlist
router.get('/wishlist', auth, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.user.id });
    if (!profile) {
      return res.json([]);
    }
    res.json(profile.wishlist || []);
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add to wishlist
router.post('/wishlist', auth, [
  body('productId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let profile = await UserProfile.findOne({ userId: req.user.id });
    if (!profile) {
      profile = new UserProfile({ userId: req.user.id });
    }

    // Check if already in wishlist
    const existingItem = profile.wishlist.find(item => 
      item.productId.toString() === req.body.productId
    );

    if (existingItem) {
      return res.status(400).json({ message: 'Product already in wishlist' });
    }

    profile.wishlist.push({
      productId: req.body.productId,
      addedAt: new Date()
    });

    await profile.save();
    res.json(profile.wishlist[profile.wishlist.length - 1]);
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove from wishlist
router.delete('/wishlist/:productId', auth, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.user.id });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const wishlistItem = profile.wishlist.find(item => 
      item.productId.toString() === req.params.productId
    );

    if (!wishlistItem) {
      return res.status(404).json({ message: 'Product not in wishlist' });
    }

    profile.wishlist = profile.wishlist.filter(item => 
      item.productId.toString() !== req.params.productId
    );

    await profile.save();
    res.json({ message: 'Product removed from wishlist' });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get cart
router.get('/cart', auth, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.user.id });
    if (!profile) {
      return res.json([]);
    }
    res.json(profile.cart || []);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add to cart
router.post('/cart', auth, [
  body('productId').isMongoId(),
  body('quantity').isInt({ min: 1 }),
  body('size').optional().trim(),
  body('color').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let profile = await UserProfile.findOne({ userId: req.user.id });
    if (!profile) {
      profile = new UserProfile({ userId: req.user.id });
    }

    // Check if already in cart with same size/color
    const existingItem = profile.cart.find(item => 
      item.productId.toString() === req.body.productId &&
      item.size === req.body.size &&
      item.color === req.body.color
    );

    if (existingItem) {
      existingItem.quantity += req.body.quantity;
    } else {
      profile.cart.push({
        productId: req.body.productId,
        quantity: req.body.quantity,
        size: req.body.size,
        color: req.body.color,
        addedAt: new Date()
      });
    }

    await profile.save();
    res.json(profile.cart);
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update cart item quantity
router.put('/cart/:productId', auth, [
  body('quantity').isInt({ min: 1 }),
  body('size').optional().trim(),
  body('color').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const profile = await UserProfile.findOne({ userId: req.user.id });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const cartItem = profile.cart.find(item => 
      item.productId.toString() === req.params.productId &&
      item.size === req.body.size &&
      item.color === req.body.color
    );

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    cartItem.quantity = req.body.quantity;
    await profile.save();

    res.json(cartItem);
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove from cart
router.delete('/cart/:productId', auth, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.user.id });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    profile.cart = profile.cart.filter(item => 
      item.productId.toString() !== req.params.productId
    );

    await profile.save();
    res.json({ message: 'Product removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Track user login
router.post('/track-login', auth, async (req, res) => {
  try {
    let profile = await UserProfile.findOne({ userId: req.user.id });
    
    if (!profile) {
      profile = new UserProfile({ userId: req.user.id });
    }

    // Update login count and last login time
    profile.loginCount = (profile.loginCount || 0) + 1;
    profile.lastLogin = new Date();
    
    await profile.save();
    
    res.json({ message: 'Login tracked successfully' });
  } catch (error) {
    console.error('Track login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.user.id });
    const user = await User.findById(req.user.id);
    
    if (!profile) {
      return res.json({
        loginCount: 0,
        lastLogin: null,
        createdAt: user?.createdAt || null,
        totalOrders: 0,
        wishlistCount: 0,
        cartCount: 0
      });
    }

    res.json({
      loginCount: profile.loginCount || 0,
      lastLogin: profile.lastLogin || null,
      createdAt: user?.createdAt || null,
      totalOrders: profile.orders?.length || 0,
      wishlistCount: profile.wishlist?.length || 0,
      cartCount: profile.cart?.length || 0
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
