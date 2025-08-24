const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const { getAllCategories, getProductsByCategory } = require('../utils/categorization');

// Get all active products (public route)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const query = { isActive: true }; // Only show active products

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    // Add category filter
    if (category) {
      const categoryDoc = await Category.findOne({ slug: category });
      if (categoryDoc) {
        query.category = categoryDoc._id;
      }
    }

    const products = await Product.find(query)
      .populate('category', 'name slug')
      .populate('seller', 'name')
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments(query);

    // Format products for frontend
    const formattedProducts = products.map(product => ({
      id: product._id.toString(),
      name: product.name,
      price: product.basePrice || product.price || 0, // Keep original price (USD)
      image: product.images && product.images.length > 0 ? product.images[0].url : null,
      category: product.category?.name || 'Uncategorized',
      rating: product.ratings?.average || 0,
      brand: product.brand,
      description: product.shortDescription || product.description,
      seller: product.seller?.name || 'Thrifty Clothing'
    }));

    res.json({
      products: formattedProducts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// Get categories for filtering
router.get('/categories', async (req, res) => {
  try {
    const categories = await getAllCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

// Get website settings (public)
router.get('/website-settings', async (req, res) => {
  try {
    const WebsiteSettings = require('../models/WebsiteSettings');
    let settings = await WebsiteSettings.findOne();
    
    if (!settings) {
      // Return default settings if none exist in database
      settings = {
        heroImages: [
          { id: 1, url: '', title: 'Hero Image 1', description: 'First hero image', order: 1, isActive: true },
          { id: 2, url: '', title: 'Hero Image 2', description: 'Second hero image', order: 2, isActive: true },
          { id: 3, url: '', title: 'Hero Image 3', description: 'Third hero image', order: 3, isActive: true }
        ],
        featuredCategories: [
          { id: 1, name: 'Men', icon: '👨', color: 'bg-blue-500', order: 1, isActive: true, image: '' },
          { id: 2, name: 'Women', icon: '👩', color: 'bg-pink-500', order: 2, isActive: true, image: '' },
          { id: 3, name: 'Kids', icon: '👶', color: 'bg-green-500', order: 3, isActive: true, image: '' },
          { id: 4, name: 'Accessories', icon: '👜', color: 'bg-purple-500', order: 4, isActive: true, image: '' }
        ],
        websiteSettings: {
          siteName: 'Thrifty Clothing',
          siteDescription: 'Your one-stop destination for trendy and affordable fashion',
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
          logo: '',
          favicon: '',
          contactEmail: 'support@thriftyclothing.com',
          contactPhone: '+91 98765 43210',
          address: '123 Fashion Street, Mumbai, India',
          socialMedia: {
            facebook: 'https://facebook.com/thriftyclothing',
            instagram: 'https://instagram.com/thriftyclothing',
            twitter: 'https://twitter.com/thriftyclothing',
            youtube: 'https://youtube.com/thriftyclothing'
          }
        },
        announcements: [
          { id: 1, text: 'Free shipping on orders above ₹999!', isActive: true, order: 1 },
          { id: 2, text: 'New collection launching soon!', isActive: true, order: 2 },
          { id: 3, text: 'Get 20% off on your first order!', isActive: false, order: 3 }
        ]
      };
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching website settings:', error);
    res.status(500).json({ message: 'Error fetching website settings', error: error.message });
  }
});

// Get products by category
router.get('/categories/:categorySlug', async (req, res) => {
  try {
    const { categorySlug } = req.params;
    const { page = 1, limit = 12, sort = 'createdAt', order = 'desc' } = req.query;
    
    const result = await getProductsByCategory(categorySlug, { page, limit, sort, order });
    res.json(result);
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ message: 'Error fetching products by category', error: error.message });
  }
});

module.exports = router;

