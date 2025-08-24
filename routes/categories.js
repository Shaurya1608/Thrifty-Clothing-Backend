const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    let categories = await Category.find({ isActive: true }).sort('sortOrder');
    
    // If no categories exist, create default ones
    if (categories.length === 0) {
      const defaultCategories = [
        { name: 'T-Shirts', slug: 't-shirts', description: 'Comfortable t-shirts for everyday wear' },
        { name: 'Jeans', slug: 'jeans', description: 'Classic and trendy jeans' },
        { name: 'Hoodies', slug: 'hoodies', description: 'Warm and cozy hoodies' },
        { name: 'Dresses', slug: 'dresses', description: 'Elegant dresses for all occasions' },
        { name: 'Shoes', slug: 'shoes', description: 'Stylish footwear for every style' },
        { name: 'Jackets', slug: 'jackets', description: 'Trendy jackets and outerwear' }
      ];
      
      for (const cat of defaultCategories) {
        const category = new Category(cat);
        await category.save();
      }
      
      categories = await Category.find({ isActive: true }).sort('sortOrder');
    }
    
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

