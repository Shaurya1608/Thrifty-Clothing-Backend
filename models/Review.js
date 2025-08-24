const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  images: [{
    url: String,
    alt: String
  }],
  verified: {
    type: Boolean,
    default: false
  },
  helpful: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    helpful: {
      type: Boolean,
      default: true
    }
  }],
  helpfulCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: Date,
  moderationReason: String,
  isAnonymous: {
    type: Boolean,
    default: false
  },
  tags: [String], // e.g., ['quality', 'fit', 'delivery', 'value']
  pros: [String],
  cons: [String],
  recommend: {
    type: Boolean
  },
  purchaseType: {
    type: String,
    enum: ['verified_purchase', 'gift', 'other'],
    default: 'other'
  }
}, {
  timestamps: true
});

// Indexes
reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ user: 1, product: 1 }, { unique: true });
reviewSchema.index({ status: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ verified: 1 });

// Virtual for helpful percentage
reviewSchema.virtual('helpfulPercentage').get(function() {
  if (this.helpful.length === 0) return 0;
  const helpfulVotes = this.helpful.filter(h => h.helpful).length;
  return Math.round((helpfulVotes / this.helpful.length) * 100);
});

// Method to mark review as helpful/unhelpful
reviewSchema.methods.markHelpful = function(userId, isHelpful) {
  const existingVote = this.helpful.find(h => h.user.toString() === userId.toString());
  
  if (existingVote) {
    // Update existing vote
    if (existingVote.helpful !== isHelpful) {
      existingVote.helpful = isHelpful;
      this.helpfulCount = this.helpful.filter(h => h.helpful).length;
    }
  } else {
    // Add new vote
    this.helpful.push({
      user: userId,
      helpful: isHelpful
    });
    this.helpfulCount = this.helpful.filter(h => h.helpful).length;
  }
  
  return this.save();
};

// Method to remove helpful vote
reviewSchema.methods.removeHelpfulVote = function(userId) {
  this.helpful = this.helpful.filter(h => h.user.toString() !== userId.toString());
  this.helpfulCount = this.helpful.filter(h => h.helpful).length;
  return this.save();
};

// Method to approve review
reviewSchema.methods.approve = function(moderatorId) {
  this.status = 'approved';
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  return this.save();
};

// Method to reject review
reviewSchema.methods.reject = function(moderatorId, reason) {
  this.status = 'rejected';
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  this.moderationReason = reason;
  return this.save();
};

// Static method to get review statistics for a product
reviewSchema.statics.getProductStats = function(productId) {
  return this.aggregate([
    { $match: { product: mongoose.Types.ObjectId(productId), status: 'approved' } },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    },
    {
      $project: {
        totalReviews: 1,
        averageRating: { $round: ['$averageRating', 1] },
        ratingDistribution: {
          '1': { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 1] } } } },
          '2': { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 2] } } } },
          '3': { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 3] } } } },
          '4': { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 4] } } } },
          '5': { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 5] } } } }
        }
      }
    }
  ]);
};

// Static method to get reviews with pagination and filters
reviewSchema.statics.getProductReviews = function(productId, options = {}) {
  const {
    page = 1,
    limit = 10,
    rating,
    sortBy = 'helpfulCount',
    sortOrder = 'desc',
    verifiedOnly = false
  } = options;

  const match = { product: mongoose.Types.ObjectId(productId), status: 'approved' };
  if (rating) match.rating = rating;
  if (verifiedOnly) match.verified = true;

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  return this.find(match)
    .populate('user', 'name profilePicture')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);
};

// Pre-save middleware to update product ratings
reviewSchema.post('save', async function() {
  if (this.status === 'approved') {
    const Product = mongoose.model('Product');
    const product = await Product.findById(this.product);
    if (product) {
      await product.updateRatings();
    }
  }
});

// Pre-remove middleware to update product ratings
reviewSchema.post('remove', async function() {
  const Product = mongoose.model('Product');
  const product = await Product.findById(this.product);
  if (product) {
    await product.updateRatings();
  }
});

// Ensure virtual fields are serialized
reviewSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    if (ret.isAnonymous) {
      delete ret.user;
    }
    return ret;
  }
});

module.exports = mongoose.model('Review', reviewSchema);

