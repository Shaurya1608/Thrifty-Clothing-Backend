const Category = require('../models/Category');

// Keywords for automatic categorization
const CATEGORY_KEYWORDS = {
  men: [
    'men', 'men\'s', 'male', 'guy', 'gentleman', 'mens', 'man\'s', 'mans',
    'shirt', 't-shirt', 'tshirt', 'polo', 'formal', 'casual', 'jeans', 'trousers',
    'pants', 'shorts', 'jacket', 'blazer', 'suit', 'tie', 'belt', 'shoes',
    'sneakers', 'boots', 'loafers', 'oxfords', 'watch', 'wallet', 'bag',
    'backpack', 'briefcase', 'sweater', 'hoodie', 'sweatshirt', 'vest',
    'waistcoat', 'cardigan', 'pullover', 'jumper', 'tank', 'singlet'
  ],
  women: [
    'women', 'women\'s', 'female', 'lady', 'ladies', 'womens', 'woman\'s', 'womans',
    'dress', 'skirt', 'blouse', 'top', 'tank', 'cami', 'cardigan', 'sweater',
    'jumper', 'pullover', 'hoodie', 'sweatshirt', 'jacket', 'coat', 'blazer',
    'jeans', 'pants', 'trousers', 'leggings', 'shorts', 'shoes', 'heels',
    'flats', 'sneakers', 'boots', 'sandals', 'pumps', 'stilettos', 'wedges',
    'bag', 'purse', 'handbag', 'clutch', 'tote', 'backpack', 'jewelry',
    'necklace', 'earrings', 'bracelet', 'ring', 'watch', 'scarf', 'shawl',
    'wrap', 'kimono', 'maxi', 'mini', 'midi', 'bodycon', 'a-line', 'fit-and-flare'
  ],
  kids: [
    'kids', 'kid\'s', 'children', 'child', 'baby', 'infant', 'toddler',
    'boys', 'boy\'s', 'girls', 'girl\'s', 'junior', 'youth', 'teen',
    'school', 'uniform', 'play', 'toy', 'diaper', 'onesie', 'romper'
  ],
  accessories: [
    'accessory', 'accessories', 'jewelry', 'watch', 'necklace', 'earrings',
    'bracelet', 'ring', 'anklet', 'brooch', 'pin', 'scarf', 'shawl',
    'belt', 'wallet', 'bag', 'purse', 'handbag', 'clutch', 'tote',
    'backpack', 'briefcase', 'duffel', 'luggage', 'suitcase', 'hat',
    'cap', 'beanie', 'sunglasses', 'glasses', 'umbrella', 'tie',
    'bow tie', 'cufflinks', 'socks', 'stockings', 'tights', 'gloves',
    'mittens', 'mask', 'bandana', 'headband', 'hair', 'wig', 'perfume',
    'cologne', 'fragrance', 'cosmetics', 'makeup', 'skincare'
  ],
  footwear: [
    'shoes', 'footwear', 'sneakers', 'boots', 'sandals', 'flats',
    'heels', 'pumps', 'stilettos', 'wedges', 'loafers', 'oxfords',
    'derby', 'chelsea', 'ankle', 'knee-high', 'thigh-high', 'mules',
    'clogs', 'espadrilles', 'ballet', 'jelly', 'slides', 'slippers',
    'athletic', 'running', 'training', 'gym', 'sports', 'hiking',
    'work', 'safety', 'dress', 'casual', 'formal', 'party', 'wedding'
  ],
  bags: [
    'bag', 'bags', 'purse', 'handbag', 'clutch', 'tote', 'backpack',
    'briefcase', 'duffel', 'luggage', 'suitcase', 'travel', 'messenger',
    'crossbody', 'shoulder', 'hobo', 'satchel', 'bucket', 'barrel',
    'doctor', 'laptop', 'gym', 'beach', 'picnic', 'shopping', 'grocery'
  ]
};

// Gender-specific keywords that override other categories
const GENDER_KEYWORDS = {
  men: ['men', 'men\'s', 'male', 'guy', 'gentleman', 'mens', 'man\'s', 'mans'],
  women: ['women', 'women\'s', 'female', 'lady', 'ladies', 'womens', 'woman\'s', 'womans'],
  kids: ['kids', 'kid\'s', 'children', 'child', 'baby', 'infant', 'toddler', 'boys', 'boy\'s', 'girls', 'girl\'s']
};

/**
 * Automatically categorize a product based on its name, description, and other attributes
 * @param {Object} productData - Product data containing name, description, etc.
 * @returns {Object} - Categorization result with primary and secondary categories
 */
async function autoCategorizeProduct(productData) {
  const { name = '', description = '', brand = '', tags = [] } = productData;
  
  // Combine all text for analysis
  const textToAnalyze = `${name} ${description} ${brand} ${tags.join(' ')}`.toLowerCase();
  
  console.log('🔍 Analyzing text for categorization:', textToAnalyze);
  
  // First, check for explicit gender keywords
  let primaryCategory = null;
  let secondaryCategory = null;
  
  // Check for gender-specific keywords first
  for (const [gender, keywords] of Object.entries(GENDER_KEYWORDS)) {
    if (keywords.some(keyword => textToAnalyze.includes(keyword))) {
      primaryCategory = gender;
      console.log(`👤 Found gender keyword: ${gender}`);
      break;
    }
  }
  
  // If no gender found, try to infer from other keywords
  if (!primaryCategory) {
    // Check for men's clothing keywords
    const menKeywords = CATEGORY_KEYWORDS.men.filter(keyword => 
      !GENDER_KEYWORDS.men.includes(keyword) && textToAnalyze.includes(keyword)
    );
    
    // Check for women's clothing keywords
    const womenKeywords = CATEGORY_KEYWORDS.women.filter(keyword => 
      !GENDER_KEYWORDS.women.includes(keyword) && textToAnalyze.includes(keyword)
    );
    
    if (menKeywords.length > womenKeywords.length) {
      primaryCategory = 'men';
      console.log(`👔 Inferred men's category from keywords:`, menKeywords);
    } else if (womenKeywords.length > menKeywords.length) {
      primaryCategory = 'women';
      console.log(`👗 Inferred women's category from keywords:`, womenKeywords);
    }
  }
  
  // Determine secondary category based on product type
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category !== 'men' && category !== 'women' && category !== 'kids') {
      if (keywords.some(keyword => textToAnalyze.includes(keyword))) {
        secondaryCategory = category;
        console.log(`🏷️ Found secondary category: ${category}`);
        break;
      }
    }
  }
  
  // If no primary category found, default to 'unisex' or 'accessories'
  if (!primaryCategory) {
    if (secondaryCategory === 'accessories' || secondaryCategory === 'bags' || secondaryCategory === 'footwear') {
      primaryCategory = 'unisex';
    } else {
      primaryCategory = 'unisex';
    }
    console.log(`❓ No specific gender found, defaulting to: ${primaryCategory}`);
  }
  
  // Get or create categories in the database
  const primaryCategoryDoc = await getOrCreateCategory(primaryCategory);
  const secondaryCategoryDoc = secondaryCategory ? await getOrCreateCategory(secondaryCategory) : null;
  
  return {
    primaryCategory: primaryCategoryDoc._id,
    secondaryCategory: secondaryCategoryDoc?._id || null,
    confidence: {
      primary: primaryCategory ? 'high' : 'low',
      secondary: secondaryCategory ? 'high' : 'low'
    },
    detectedKeywords: {
      primary: primaryCategory,
      secondary: secondaryCategory
    }
  };
}

/**
 * Get or create a category in the database
 * @param {string} categoryName - Name of the category
 * @returns {Object} - Category document
 */
async function getOrCreateCategory(categoryName) {
  const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  
  let category = await Category.findOne({ slug });
  
  if (!category) {
    console.log(`📝 Creating new category: ${categoryName}`);
    category = new Category({
      name: categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
      slug,
      description: `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} clothing and accessories`,
      isActive: true
    });
    await category.save();
  }
  
  return category;
}

/**
 * Get all available categories for the frontend
 * @returns {Array} - Array of category objects
 */
async function getAllCategories() {
  const categories = await Category.find({ isActive: true }).sort('name');
  return categories.map(cat => ({
    id: cat._id.toString(),
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    image: cat.image
  }));
}

/**
 * Get products by category
 * @param {string} categorySlug - Category slug
 * @param {Object} options - Query options (page, limit, etc.)
 * @returns {Object} - Products and pagination info
 */
async function getProductsByCategory(categorySlug, options = {}) {
  const { page = 1, limit = 12, sort = 'createdAt', order = 'desc' } = options;
  
  const category = await Category.findOne({ slug: categorySlug, isActive: true });
  if (!category) {
    throw new Error('Category not found');
  }
  
  const Product = require('../models/Product');
  const skip = (page - 1) * limit;
  
  const query = { 
    category: category._id, 
    isActive: true 
  };
  
  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('category', 'name slug')
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(query)
  ]);
  
  return {
    products: products.map(product => ({
      id: product._id.toString(),
      name: product.name,
      price: product.basePrice || product.price || 0,
      image: product.images && product.images.length > 0 ? product.images[0].url : null,
      category: product.category?.name || 'Uncategorized',
      brand: product.brand,
      isOnSale: product.isOnSale,
      discountedPrice: product.discountedPrice,
      ratings: product.ratings
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    },
    category: {
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      description: category.description
    }
  };
}

module.exports = {
  autoCategorizeProduct,
  getOrCreateCategory,
  getAllCategories,
  getProductsByCategory,
  CATEGORY_KEYWORDS,
  GENDER_KEYWORDS
};
