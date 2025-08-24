const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Personal Information
  firstName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  
  // Address Information
  addresses: [{
    type: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'home'
    },
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'India'
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  
  // Preferences
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    newsletter: {
      type: Boolean,
      default: true
    },
    sizePreference: {
      type: String,
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    },
    favoriteCategories: [{
      type: String,
      enum: ['men', 'women', 'kids', 'accessories', 'footwear']
    }]
  },
  
  // Shopping Data
  wishlist: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  cart: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    size: String,
    color: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Order History
  orders: [{
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    orderDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending'
    }
  }],
  
  // Activity Tracking
  lastLogin: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  },
  
  // Social/Referral
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
userProfileSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate referral code if not exists
userProfileSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = 'REF' + Math.random().toString(36).substr(2, 8).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('UserProfile', userProfileSchema);
