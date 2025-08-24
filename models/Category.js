const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String
  },
  image: {
    type: String
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  level: {
    type: Number,
    default: 0
  },
  path: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  seo: {
    title: String,
    description: String,
    keywords: [String]
  },
  attributes: [{
    name: String,
    type: {
      type: String,
      enum: ['text', 'number', 'boolean', 'select', 'multiselect']
    },
    options: [String],
    isRequired: {
      type: Boolean,
      default: false
    },
    isFilterable: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Indexes
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1, isActive: 1 });
categorySchema.index({ level: 1, isActive: 1 });
categorySchema.index({ isFeatured: 1, isActive: 1 });
categorySchema.index({ sortOrder: 1 });

// Virtual for full path
categorySchema.virtual('fullPath').get(function() {
  return this.path.map(id => id.toString()).join(' > ');
});

// Method to get children
categorySchema.methods.getChildren = function() {
  return this.model('Category').find({ parent: this._id, isActive: true }).sort('sortOrder');
};

// Method to get all descendants
categorySchema.methods.getDescendants = function() {
  return this.model('Category').find({ path: this._id, isActive: true }).sort('sortOrder');
};

// Method to get ancestors
categorySchema.methods.getAncestors = function() {
  return this.model('Category').find({ _id: { $in: this.path }, isActive: true }).sort('level');
};

// Static method to build category tree
categorySchema.statics.buildTree = function(categories) {
  const categoryMap = {};
  const roots = [];

  // Create a map of all categories
  categories.forEach(category => {
    categoryMap[category._id.toString()] = {
      ...category.toObject(),
      children: []
    };
  });

  // Build the tree structure
  categories.forEach(category => {
    const categoryObj = categoryMap[category._id.toString()];
    if (category.parent) {
      const parent = categoryMap[category.parent.toString()];
      if (parent) {
        parent.children.push(categoryObj);
      }
    } else {
      roots.push(categoryObj);
    }
  });

  return roots;
};

// Pre-save middleware to update level and path
categorySchema.pre('save', async function(next) {
  if (this.isModified('parent')) {
    if (this.parent) {
      const parent = await this.model('Category').findById(this.parent);
      if (parent) {
        this.level = parent.level + 1;
        this.path = [...parent.path, parent._id];
      }
    } else {
      this.level = 0;
      this.path = [];
    }
  }
  next();
});

// Ensure virtual fields are serialized
categorySchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Category', categorySchema);

