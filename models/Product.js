const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  size: {
    type: String,
    required: true,
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58', '60', '62', '64', '66', '68', '70', '72', '74', '76', '78', '80', '82', '84', '86', '88', '90', '92', '94', '96', '98', '100', '102', '104', '106', '108', '110', '112', '114', '116', '118', '120', '122', '124', '126', '128', '130', '132', '134', '136', '138', '140', '142', '144', '146', '148', '150', '152', '154', '156', '158', '160', '162', '164', '166', '168', '170', '172', '174', '176', '178', '180', '182', '184', '186', '188', '190', '192', '194', '196', '198', '200', '202', '204', '206', '208', '210', '212', '214', '216', '218', '220', '222', '224', '226', '228', '230', '232', '234', '236', '238', '240', '242', '244', '246', '248', '250', '252', '254', '256', '258', '260', '262', '264', '266', '268', '270', '272', '274', '276', '278', '280', '282', '284', '286', '288', '290', '292', '294', '296', '298', '300', '302', '304', '306', '308', '310', '312', '314', '316', '318', '320', '322', '324', '326', '328', '330', '332', '334', '336', '338', '340', '342', '344', '346', '348', '350', '352', '354', '356', '358', '360', '362', '364', '366', '368', '370', '372', '374', '376', '378', '380', '382', '384', '386', '388', '390', '392', '394', '396', '398', '400', '402', '404', '406', '408', '410', '412', '414', '416', '418', '420', '422', '424', '426', '428', '430', '432', '434', '436', '438', '440', '442', '444', '446', '448', '450', '452', '454', '456', '458', '460', '462', '464', '466', '468', '470', '472', '474', '476', '478', '480', '482', '484', '486', '488', '490', '492', '494', '496', '498', '500', '502', '504', '506', '508', '510', '512', '514', '516', '518', '520', '522', '524', '526', '528', '530', '532', '534', '536', '538', '540', '542', '544', '546', '548', '550', '552', '554', '556', '558', '560', '562', '564', '566', '568', '570', '572', '574', '576', '578', '580', '582', '584', '586', '588', '590', '592', '594', '596', '598', '600', '602', '604', '606', '608', '610', '612', '614', '616', '618', '620', '622', '624', '626', '628', '630', '632', '634', '636', '638', '640', '642', '644', '646', '648', '650', '652', '654', '656', '658', '660', '662', '664', '666', '668', '670', '672', '674', '676', '678', '680', '682', '684', '686', '688', '690', '692', '694', '696', '698', '700', '702', '704', '706', '708', '710', '712', '714', '716', '718', '720', '722', '724', '726', '728', '730', '732', '734', '736', '738', '740', '742', '744', '746', '748', '750', '752', '754', '756', '758', '760', '762', '764', '766', '768', '770', '772', '774', '776', '778', '780', '782', '784', '786', '788', '790', '792', '794', '796', '798', '800', '802', '804', '806', '808', '810', '812', '814', '816', '818', '820', '822', '824', '826', '828', '830', '832', '834', '836', '838', '840', '842', '844', '846', '848', '850', '852', '854', '856', '858', '860', '862', '864', '866', '868', '870', '872', '874', '876', '878', '880', '882', '884', '886', '888', '890', '892', '894', '896', '898', '900', '902', '904', '906', '908', '910', '912', '914', '916', '918', '920', '922', '924', '926', '928', '930', '932', '934', '936', '938', '940', '942', '944', '946', '948', '950', '952', '954', '956', '958', '960', '962', '964', '966', '968', '970', '972', '974', '976', '978', '980', '982', '984', '986', '988', '990', '992', '994', '996', '998', '1000', 'Free Size', 'One Size', 'Custom']
  },
  color: {
    type: String,
    required: true
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
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
  sku: {
    type: String,
    unique: true,
    sparse: true
  }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    maxlength: 200
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  brand: {
    type: String,
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    public_id: {
      type: String,
      required: false // Made optional for backward compatibility
    },
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  variants: [variantSchema],
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  discountedPrice: {
    type: Number,
    min: 0
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100
  },
  tags: [String],
  features: [String],
  specifications: {
    material: String,
    care: String,
    fit: {
      type: String,
      enum: ['Regular', 'Slim', 'Loose', 'Oversized', 'Relaxed', 'Comfortable']
    },
    occasion: [String],
    season: [String],
    pattern: String,
    neckline: String,
    sleeve: String,
    length: String,
    closure: String,
    pockets: Boolean,
    hood: Boolean,
    collar: Boolean
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  wishlistCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isNewArrival: {
    type: Boolean,
    default: false
  },
  isBestSeller: {
    type: Boolean,
    default: false
  },
  isOnSale: {
    type: Boolean,
    default: false
  },
  saleEndDate: Date,
  returnPolicy: {
    type: String,
    default: '7 days return policy'
  },
  shippingInfo: {
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    freeShipping: {
      type: Boolean,
      default: false
    },
    shippingTime: {
      type: String,
      default: '3-5 business days'
    }
  },
  seo: {
    title: String,
    description: String,
    keywords: [String]
  }
}, {
  timestamps: true
});

// Indexes for better performance
productSchema.index({ name: 'text', description: 'text', brand: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ brand: 1, isActive: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ isNewArrival: 1, isActive: 1 });
productSchema.index({ isBestSeller: 1, isActive: 1 });
productSchema.index({ isOnSale: 1, isActive: 1 });
productSchema.index({ 'ratings.average': -1 });
productSchema.index({ createdAt: -1 });

// Virtual for primary image
productSchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : (this.images[0] ? this.images[0].url : null);
});

// Virtual for current price
productSchema.virtual('currentPrice').get(function() {
  return this.discountedPrice || this.basePrice;
});

// Virtual for discount percentage
productSchema.virtual('discountPercent').get(function() {
  if (this.discountedPrice && this.basePrice) {
    return Math.round(((this.basePrice - this.discountedPrice) / this.basePrice) * 100);
  }
  return 0;
});

// Method to update ratings
productSchema.methods.updateRatings = function() {
  const Review = mongoose.model('Review');
  return Review.aggregate([
    { $match: { product: this._id } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]).then(result => {
    if (result.length > 0) {
      this.ratings.average = Math.round(result[0].averageRating * 10) / 10;
      this.ratings.count = result[0].count;
      this.reviewCount = result[0].count;
    } else {
      this.ratings.average = 0;
      this.ratings.count = 0;
      this.reviewCount = 0;
    }
    return this.save();
  });
};

// Ensure virtual fields are serialized
productSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Product', productSchema);

