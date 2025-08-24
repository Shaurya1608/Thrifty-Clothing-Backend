const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
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
    min: 1
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
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded'],
    default: 'pending'
  },
  returnReason: String,
  returnDate: Date,
  refundAmount: Number
});

const shippingAddressSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true
  },
  landmark: String
});

const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['cod', 'upi', 'card', 'wallet', 'emi', 'netbanking'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: String,
  gateway: String,
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  paidAt: Date,
  refundedAt: Date
});

const trackingSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['order_placed', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
    required: true
  },
  description: String,
  location: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  trackingNumber: String,
  courier: String
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  shippingAddress: shippingAddressSchema,
  billingAddress: shippingAddressSchema,
  payment: paymentSchema,
  tracking: [trackingSchema],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'refunded'],
    default: 'pending'
  },
  subtotal: {
    type: Number,
    required: true,
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
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  coupon: {
    code: String,
    discount: Number
  },
  notes: String,
  estimatedDelivery: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  cancelledBy: {
    type: String,
    enum: ['customer', 'admin', 'system']
  },
  cancellationReason: String,
  returnPolicy: {
    type: String,
    default: '7 days return policy'
  },
  isGift: {
    type: Boolean,
    default: false
  },
  giftMessage: String
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ createdAt: -1 });

// Generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Get count of orders for today
    const todayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    
    const count = await this.constructor.countDocuments({
      createdAt: { $gte: todayStart, $lt: todayEnd }
    });
    
    const sequence = (count + 1).toString().padStart(4, '0');
    this.orderNumber = `TC${year}${month}${day}${sequence}`;
  }
  next();
});

// Virtual for current tracking status
orderSchema.virtual('currentTracking').get(function() {
  if (this.tracking.length > 0) {
    return this.tracking[this.tracking.length - 1];
  }
  return null;
});

// Virtual for order summary
orderSchema.virtual('orderSummary').get(function() {
  return {
    totalItems: this.items.reduce((sum, item) => sum + item.quantity, 0),
    totalValue: this.total,
    status: this.status,
    orderDate: this.createdAt
  };
});

// Method to add tracking update
orderSchema.methods.addTrackingUpdate = function(status, description, location, trackingNumber, courier) {
  this.tracking.push({
    status,
    description,
    location,
    trackingNumber,
    courier
  });
  this.status = status;
  return this.save();
};

// Method to calculate totals
orderSchema.methods.calculateTotals = function() {
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  this.total = this.subtotal + this.tax + this.shipping - this.discount;
  return this.save();
};

// Static method to get order statistics
orderSchema.statics.getOrderStats = function(userId) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$total' }
      }
    }
  ]);
};

// Ensure virtual fields are serialized
orderSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Order', orderSchema);

