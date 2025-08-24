const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variant: {
    size: String,
    color: String,
    sku: String
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discountedPrice: {
    type: Number,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  isSavedForLater: {
    type: Boolean,
    default: false
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  coupon: {
    code: String,
    discount: Number,
    type: {
      type: String,
      enum: ['percentage', 'fixed']
    },
    minAmount: Number
  },
  subtotal: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  shipping: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
cartSchema.index({ user: 1 });
cartSchema.index({ 'items.product': 1 });

// Virtual for active cart items (not saved for later)
cartSchema.virtual('activeItems').get(function() {
  return this.items.filter(item => !item.isSavedForLater);
});

// Virtual for saved for later items
cartSchema.virtual('savedItems').get(function() {
  return this.items.filter(item => item.isSavedForLater);
});

// Virtual for item count
cartSchema.virtual('itemCount').get(function() {
  return this.activeItems.reduce((sum, item) => sum + item.quantity, 0);
});

// Method to add item to cart
cartSchema.methods.addItem = function(productId, variant, quantity = 1) {
  const existingItem = this.items.find(item => 
    item.product.toString() === productId.toString() &&
    item.variant.size === variant.size &&
    item.variant.color === variant.color &&
    !item.isSavedForLater
  );

  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.totalPrice = existingItem.quantity * (existingItem.discountedPrice || existingItem.price);
  } else {
    this.items.push({
      product: productId,
      variant,
      quantity,
      price: variant.price,
      discountedPrice: variant.discountedPrice,
      totalPrice: quantity * (variant.discountedPrice || variant.price)
    });
  }

  this.lastUpdated = new Date();
  return this.calculateTotals();
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = function(itemId, quantity) {
  const item = this.items.id(itemId);
  if (item) {
    item.quantity = quantity;
    item.totalPrice = quantity * (item.discountedPrice || item.price);
    this.lastUpdated = new Date();
    return this.calculateTotals();
  }
  throw new Error('Item not found in cart');
};

// Method to remove item from cart
cartSchema.methods.removeItem = function(itemId) {
  this.items = this.items.filter(item => item._id.toString() !== itemId.toString());
  this.lastUpdated = new Date();
  return this.calculateTotals();
};

// Method to move item to saved for later
cartSchema.methods.moveToSavedForLater = function(itemId) {
  const item = this.items.id(itemId);
  if (item) {
    item.isSavedForLater = true;
    this.lastUpdated = new Date();
    return this.calculateTotals();
  }
  throw new Error('Item not found in cart');
};

// Method to move item from saved for later to cart
cartSchema.methods.moveToCart = function(itemId) {
  const item = this.items.id(itemId);
  if (item) {
    item.isSavedForLater = false;
    this.lastUpdated = new Date();
    return this.calculateTotals();
  }
  throw new Error('Item not found in cart');
};

// Method to clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  this.coupon = null;
  this.subtotal = 0;
  this.tax = 0;
  this.shipping = 0;
  this.discount = 0;
  this.total = 0;
  this.lastUpdated = new Date();
  return this.save();
};

// Method to apply coupon
cartSchema.methods.applyCoupon = function(couponCode, discount, type, minAmount) {
  this.coupon = {
    code: couponCode,
    discount,
    type,
    minAmount
  };
  this.lastUpdated = new Date();
  return this.calculateTotals();
};

// Method to remove coupon
cartSchema.methods.removeCoupon = function() {
  this.coupon = null;
  this.lastUpdated = new Date();
  return this.calculateTotals();
};

// Method to calculate totals
cartSchema.methods.calculateTotals = function() {
  this.subtotal = this.activeItems.reduce((sum, item) => sum + item.totalPrice, 0);
  
  // Calculate discount
  let discount = 0;
  if (this.coupon && this.subtotal >= (this.coupon.minAmount || 0)) {
    if (this.coupon.type === 'percentage') {
      discount = (this.subtotal * this.coupon.discount) / 100;
    } else {
      discount = this.coupon.discount;
    }
  }
  this.discount = Math.min(discount, this.subtotal);
  
  // Calculate shipping (free shipping if total > 1000)
  this.shipping = this.subtotal > 1000 ? 0 : 100;
  
  // Calculate tax (18% GST)
  this.tax = (this.subtotal - this.discount) * 0.18;
  
  // Calculate total
  this.total = this.subtotal - this.discount + this.tax + this.shipping;
  
  return this.save();
};

// Method to check if cart is empty
cartSchema.methods.isEmpty = function() {
  return this.activeItems.length === 0;
};

// Method to get cart summary
cartSchema.methods.getSummary = function() {
  return {
    itemCount: this.itemCount,
    subtotal: this.subtotal,
    discount: this.discount,
    tax: this.tax,
    shipping: this.shipping,
    total: this.total,
    currency: this.currency
  };
};

// Ensure virtual fields are serialized
cartSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Cart', cartSchema);

