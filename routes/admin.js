const express = require('express');
const router = express.Router();
const { requireAdmin, requireAdminOrSeller } = require('../middleware/admin');
const upload = require('../middleware/upload');
const { uploadMultipleImages, deleteMultipleImages } = require('../utils/imageUpload');
const { autoCategorizeProduct, getAllCategories, getProductsByCategory } = require('../utils/categorization');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Category = require('../models/Category');
const WebsiteSettings = require('../models/WebsiteSettings');
const Review = require('../models/Review');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// ==================== DASHBOARD & ANALYTICS ====================

// Get admin dashboard stats
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    console.log('=== DASHBOARD REQUEST ===');
    console.log('User:', req.user);
    console.log('User role:', req.user.role);
    
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Total stats
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalSellers = await User.countDocuments({ role: 'seller' });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    // Revenue stats
    const totalRevenue = await Order.aggregate([
      { $match: { status: { $in: ['completed', 'delivered'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const monthlyRevenue = await Order.aggregate([
      { 
        $match: { 
          status: { $in: ['completed', 'delivered'] },
          createdAt: { $gte: startOfMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const yearlyRevenue = await Order.aggregate([
      { 
        $match: { 
          status: { $in: ['completed', 'delivered'] },
          createdAt: { $gte: startOfYear }
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Recent orders
    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    // Top selling products
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' } } },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);

    // Low stock products
    const lowStockProducts = await Product.find({
      'variants.stock': { $lt: 10 }
    }).limit(10);

    console.log('Dashboard stats calculated:', {
      totalUsers,
      totalSellers,
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      yearlyRevenue: yearlyRevenue[0]?.total || 0
    });

    res.json({
      stats: {
        totalUsers,
        totalSellers,
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        yearlyRevenue: yearlyRevenue[0]?.total || 0
      },
      recentOrders,
      topProducts,
      lowStockProducts
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Error fetching dashboard data', error: error.message });
  }
});

// ==================== USER MANAGEMENT ====================

// Get all users with pagination
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const role = req.query.role || '';

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Update user role
router.patch('/users/:userId/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const { userId } = req.params;

    if (!['user', 'seller', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User role updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user role', error: error.message });
  }
});

// Ban/Unban user
router.patch('/users/:userId/status', requireAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: `User ${isActive ? 'activated' : 'banned'} successfully`, 
      user 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user status', error: error.message });
  }
});

// ==================== SELLER MANAGEMENT ====================

// Get all sellers
router.get('/sellers', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || '';

    const query = { role: 'seller' };
    if (status === 'approved') {
      query['sellerProfile.isApproved'] = true;
    } else if (status === 'pending') {
      query['sellerProfile.isApproved'] = false;
    }

    const sellers = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      sellers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sellers', error: error.message });
  }
});

// Approve/Reject seller
router.patch('/sellers/:sellerId/approval', requireAdmin, async (req, res) => {
  try {
    const { isApproved, commissionRate } = req.body;
    const { sellerId } = req.params;

    const updateData = {
      'sellerProfile.isApproved': isApproved,
      'sellerProfile.approvalDate': isApproved ? new Date() : null
    };

    if (commissionRate !== undefined) {
      updateData['sellerProfile.commissionRate'] = commissionRate;
    }

    const seller = await User.findByIdAndUpdate(
      sellerId,
      updateData,
      { new: true }
    ).select('-password');

    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    res.json({ 
      message: `Seller ${isApproved ? 'approved' : 'rejected'} successfully`, 
      seller 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating seller approval', error: error.message });
  }
});

// ==================== PRODUCT MANAGEMENT ====================

// Create new product with image upload and automatic categorization
router.post('/products', requireAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const { name, description, price, brand, stock, isActive, tags, useAutoCategory, selectedCategory } = req.body;

    // Validate required fields
    if (!name || !price) {
      return res.status(400).json({ message: 'Name and price are required' });
    }

    let primaryCategory, secondaryCategory, categorization;

    // Handle category selection
    if (useAutoCategory === 'true') {
      console.log('🔍 Starting automatic categorization for product:', name);
      
      // Auto-categorize the product
      categorization = await autoCategorizeProduct({
        name,
        description,
        brand,
        tags: tags ? JSON.parse(tags) : []
      });
      
      primaryCategory = categorization.primaryCategory;
      secondaryCategory = categorization.secondaryCategory;
      
      console.log('✅ Auto-categorization result:', {
        primaryCategory: categorization.primaryCategory,
        secondaryCategory: categorization.secondaryCategory,
        confidence: categorization.confidence,
        detectedKeywords: categorization.detectedKeywords
      });
    } else if (selectedCategory) {
      console.log('🎯 Using manual category selection:', selectedCategory);
      
      // Handle new modal-based category structure
      if (selectedCategory.includes('-')) {
        // New format: "gender-categoryType" (e.g., "men-jackets", "women-dresses")
        const [gender, categoryType] = selectedCategory.split('-');
        
        // Create or find the category based on gender and type
        const categoryName = `${gender.charAt(0).toUpperCase() + gender.slice(1)} ${categoryType.charAt(0).toUpperCase() + categoryType.slice(1)}`;
        
        try {
          const Category = require('../models/Category');
          let manualCategory = await Category.findOne({ name: { $regex: new RegExp(categoryName, 'i') } });
          
          if (!manualCategory) {
            // Create new category if it doesn't exist
            manualCategory = await Category.create({
              name: categoryName,
              slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
              description: `${categoryName} category`
            });
            console.log('✅ Created new category:', categoryName);
          }
          
          primaryCategory = manualCategory._id;
          secondaryCategory = null;
          
          console.log('✅ Manual category selected:', manualCategory.name);
        } catch (categoryError) {
          console.error('Error handling category:', categoryError);
          return res.status(400).json({ message: 'Error processing selected category' });
        }
      } else {
        // Legacy format: direct category ID
        const Category = require('../models/Category');
        const manualCategory = await Category.findById(selectedCategory);
        
        if (!manualCategory) {
          return res.status(400).json({ message: 'Selected category not found' });
        }
        
        primaryCategory = manualCategory._id;
        secondaryCategory = null;
        
        console.log('✅ Manual category selected:', manualCategory.name);
      }
    } else {
      return res.status(400).json({ message: 'Please select a category or use auto-categorization' });
    }

    let formattedImages = [];

    // Upload images to Cloudinary if files are provided
    if (req.files && req.files.length > 0) {
      try {
        console.log('Files received:', req.files.length);
        const uploadedImages = await uploadMultipleImages(req.files);
        console.log('Images uploaded successfully:', uploadedImages.length);
        formattedImages = uploadedImages.map((image, index) => ({
          url: image.url,
          public_id: image.public_id,
          alt: `${name} image ${index + 1}`,
          isPrimary: index === 0
        }));
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(400).json({ message: 'Error uploading images: ' + uploadError.message });
      }
    }

    // Create a default variant
    const defaultVariant = {
      size: 'M',
      color: 'Default',
      stock: parseInt(stock) || 0,
      price: parseFloat(price),
      sku: `${name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`
    };

    const product = new Product({
      name,
      description: description || 'No description available',
      shortDescription: description ? description.substring(0, 200) : 'No description available',
      category: primaryCategory, // Use determined category (auto or manual)
      subcategory: secondaryCategory, // Use determined subcategory
      brand: brand || 'Thrifty Clothing',
      seller: req.user._id,
      images: formattedImages,
      variants: [defaultVariant],
      basePrice: parseFloat(price),
      tags: tags ? JSON.parse(tags) : [name.toLowerCase()],
      isActive: isActive !== undefined ? isActive : true
    });

    console.log('Saving product to database...');
    await product.save();
    console.log('Product saved successfully');

    console.log('Populating product data...');
    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name')
      .populate('seller', 'name email');

    console.log('Product populated successfully:', populatedProduct._id);
    console.log('Product data:', {
      id: populatedProduct._id,
      name: populatedProduct.name,
      category: populatedProduct.category,
      seller: populatedProduct.seller,
      imagesCount: populatedProduct.images?.length
    });
    console.log('Sending response to frontend...');
    
    try {
      // Convert to plain object and remove any problematic fields
      const productResponse = populatedProduct.toObject();
      
      // Ensure all ObjectIds are converted to strings
      if (productResponse._id) {
        productResponse._id = productResponse._id.toString();
      }
      if (productResponse.category && productResponse.category._id) {
        productResponse.category._id = productResponse.category._id.toString();
      }
      if (productResponse.seller && productResponse.seller._id) {
        productResponse.seller._id = productResponse.seller._id.toString();
      }
      
      res.status(201).json({ 
        message: 'Product created successfully', 
        product: productResponse 
      });
      console.log('Response sent successfully');
    } catch (responseError) {
      console.error('Error sending response:', responseError);
      console.error('Response error stack:', responseError.stack);
      res.status(500).json({ 
        message: 'Product created but response failed', 
        error: responseError.message 
      });
    }
  } catch (error) {
    console.error('Product creation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Error creating product', 
      error: error.message,
      details: error.stack 
    });
  }
});

// Get single product by ID
router.get('/products/:productId', requireAdminOrSeller, async (req, res) => {
  try {
    const { productId } = req.params;
    console.log('Fetching product with ID:', productId);
    console.log('User requesting:', req.user.email, 'Role:', req.user.role);
    
    const product = await Product.findById(productId)
      .populate('category', 'name')
      .populate('seller', 'name email');

    console.log('Product found:', product ? 'Yes' : 'No');
    
    if (!product) {
      console.log('Product not found for ID:', productId);
      return res.status(404).json({ message: 'Product not found' });
    }

    console.log('Product data:', {
      id: product._id,
      name: product.name,
      category: product.category,
      seller: product.seller
    });

    // If user is seller, only allow access to their own products
    if (req.user.role === 'seller' && product.seller._id.toString() !== req.user._id.toString()) {
      console.log('Access denied for seller');
      return res.status(403).json({ message: 'Access denied. You can only access your own products.' });
    }

    console.log('Sending product response');
    
    try {
      // Convert to plain object and ensure ObjectIds are strings
      const productResponse = product.toObject();
      
      if (productResponse._id) {
        productResponse._id = productResponse._id.toString();
      }
      if (productResponse.category && productResponse.category._id) {
        productResponse.category._id = productResponse.category._id.toString();
      }
      if (productResponse.seller && productResponse.seller._id) {
        productResponse.seller._id = productResponse.seller._id.toString();
      }
      
      res.json({ product: productResponse });
    } catch (responseError) {
      console.error('Error sending product response:', responseError);
      res.status(500).json({ 
        message: 'Error sending product response', 
        error: responseError.message 
      });
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
});

// Get all categories
router.get('/categories', requireAdmin, async (req, res) => {
  try {
    const categories = await getAllCategories();
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

// Get products by category
router.get('/categories/:categorySlug/products', requireAdmin, async (req, res) => {
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

// Preview auto-categorization
router.post('/preview-categorization', requireAdmin, async (req, res) => {
  try {
    const { name, description, brand, tags } = req.body;
    
    const categorization = await autoCategorizeProduct({
      name: name || '',
      description: description || '',
      brand: brand || '',
      tags: tags || []
    });
    
    res.json(categorization);
  } catch (error) {
    console.error('Error previewing categorization:', error);
    res.status(500).json({ message: 'Error previewing categorization', error: error.message });
  }
});

// Get all products with pagination
router.get('/products', requireAdminOrSeller, async (req, res) => {
  try {
    console.log('Admin products route accessed by user:', req.user.email, 'Role:', req.user.role);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const status = req.query.status || '';

    const query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (category) {
      query.category = category;
    }
    if (status) {
      query.isActive = status === 'active';
    }

    // If user is seller, only show their products
    if (req.user.role === 'seller') {
      query.seller = req.user._id;
    }

    console.log('Query:', query);

    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('seller', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(); // Convert to plain objects to avoid mongoose issues

    // Handle cases where category might be null or invalid
    const productsWithFallback = products.map(product => ({
      ...product,
      category: product.category || { name: 'Uncategorized' },
      basePrice: product.basePrice || product.price || 0 // Handle both basePrice and old price field
    }));

    const total = await Product.countDocuments(query);

    console.log('Found products:', products.length, 'Total:', total);
    console.log('Products data:', JSON.stringify(productsWithFallback, null, 2));

    res.json({
      products: productsWithFallback,
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

// Update product status
router.patch('/products/:productId/status', requireAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    const { productId } = req.params;

    const product = await Product.findByIdAndUpdate(
      productId,
      { isActive },
      { new: true }
    ).populate('category', 'name');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ 
      message: `Product ${isActive ? 'activated' : 'deactivated'} successfully`, 
      product 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating product status', error: error.message });
  }
});

// Update product with image upload
router.put('/products/:productId', requireAdmin, upload.array('images', 5), async (req, res) => {
  try {
    console.log('=== PRODUCT UPDATE REQUEST START ===');
    console.log('Headers:', req.headers);
    console.log('User:', req.user);
    
    const { productId } = req.params;
    const { name, description, price, stock, isActive, existingImages, useAutoCategory, selectedCategory } = req.body;
    
    console.log('Update product request:', { productId, name, price, stock, isActive });
    console.log('Files received:', req.files ? req.files.length : 0);
    console.log('Existing images:', existingImages);

    // Validate required fields
    if (!name || !price) {
      return res.status(400).json({ message: 'Name and price are required' });
    }

    // Get existing product to handle image deletion
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let formattedImages = [];

    // Keep existing images if specified
    if (existingImages) {
      try {
        const existingImagesArray = JSON.parse(existingImages);
        formattedImages = existingImagesArray.filter(img => img.url && img.public_id);
      } catch (parseError) {
        console.error('Error parsing existingImages:', parseError);
        formattedImages = [];
      }
    }

    // Upload new images to Cloudinary if files are provided
    if (req.files && req.files.length > 0) {
      try {
        const uploadedImages = await uploadMultipleImages(req.files);
        const newImages = uploadedImages.map((image, index) => ({
          url: image.url,
          public_id: image.public_id,
          alt: `${name} image ${formattedImages.length + index + 1}`,
          isPrimary: formattedImages.length === 0 && index === 0
        }));
        formattedImages = [...formattedImages, ...newImages];
      } catch (uploadError) {
        return res.status(400).json({ message: 'Error uploading images: ' + uploadError.message });
      }
    }

    // Delete removed images from Cloudinary
    const existingPublicIds = existingProduct.images.map(img => img.public_id).filter(Boolean);
    const newPublicIds = formattedImages.map(img => img.public_id).filter(Boolean);
    const removedPublicIds = existingPublicIds.filter(id => !newPublicIds.includes(id));
    
    if (removedPublicIds.length > 0) {
      try {
        await deleteMultipleImages(removedPublicIds);
      } catch (deleteError) {
        console.error('Error deleting images from Cloudinary:', deleteError);
      }
    }

    // Handle category selection for updates
    let primaryCategory, secondaryCategory;
    
    if (useAutoCategory === 'true') {
      console.log('🔍 Starting automatic categorization for product update:', name);
      
      // Auto-categorize the product
      const categorization = await autoCategorizeProduct({
        name,
        description,
        brand: existingProduct.brand,
        tags: existingProduct.tags || []
      });
      
      primaryCategory = categorization.primaryCategory;
      secondaryCategory = categorization.secondaryCategory;
      
      console.log('✅ Auto-categorization result for update:', {
        primaryCategory: categorization.primaryCategory,
        secondaryCategory: categorization.secondaryCategory,
        confidence: categorization.confidence,
        detectedKeywords: categorization.detectedKeywords
      });
    } else if (selectedCategory) {
      console.log('🎯 Using manual category selection for update:', selectedCategory);
      
      // Handle new modal-based category structure
      if (selectedCategory.includes('-')) {
        // New format: "gender-categoryType" (e.g., "men-jackets", "women-dresses")
        const [gender, categoryType] = selectedCategory.split('-');
        
        // Create or find the category based on gender and type
        const categoryName = `${gender.charAt(0).toUpperCase() + gender.slice(1)} ${categoryType.charAt(0).toUpperCase() + categoryType.slice(1)}`;
        
        try {
          const Category = require('../models/Category');
          let manualCategory = await Category.findOne({ name: { $regex: new RegExp(categoryName, 'i') } });
          
          if (!manualCategory) {
            // Create new category if it doesn't exist
            manualCategory = await Category.create({
              name: categoryName,
              slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
              description: `${categoryName} category`
            });
            console.log('✅ Created new category:', categoryName);
          }
          
          primaryCategory = manualCategory._id;
          secondaryCategory = null;
          
          console.log('✅ Manual category selected for update:', manualCategory.name);
        } catch (categoryError) {
          console.error('Error handling category:', categoryError);
          return res.status(400).json({ message: 'Error processing selected category' });
        }
      } else {
        // Legacy format: direct category ID
        const Category = require('../models/Category');
        const manualCategory = await Category.findById(selectedCategory);
        
        if (!manualCategory) {
          return res.status(400).json({ message: 'Selected category not found' });
        }
        
        primaryCategory = manualCategory._id;
        secondaryCategory = null;
        
        console.log('✅ Manual category selected for update:', manualCategory.name);
      }
    }

    // Update the first variant with new price and stock
    const updateData = {
      name,
      description: description || 'No description available',
      shortDescription: description ? description.substring(0, 200) : 'No description available',
      images: formattedImages,
      basePrice: parseFloat(price),
      isActive: isActive !== undefined ? isActive : true
    };

    // Update category if determined
    if (primaryCategory) {
      updateData.category = primaryCategory;
      updateData.subcategory = secondaryCategory;
    }

    console.log('Updating product with data:', updateData);
    
    const product = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true, runValidators: false }
    ).populate('category', 'name')
     .populate('seller', 'name email');

    if (!product) {
      return res.status(404).json({ message: 'Product not found after update' });
    }

    // Update the first variant if it exists
    if (product.variants && product.variants.length > 0) {
      product.variants[0].price = parseFloat(price);
      product.variants[0].stock = parseInt(stock) || 0;
      await product.save();
    }

    console.log('=== PRODUCT UPDATE SUCCESS ===');
    console.log('Updated product:', product);
    
    try {
      // Convert to plain object and ensure ObjectIds are strings
      const productResponse = product.toObject();
      
      if (productResponse._id) {
        productResponse._id = productResponse._id.toString();
      }
      if (productResponse.category && productResponse.category._id) {
        productResponse.category._id = productResponse.category._id.toString();
      }
      if (productResponse.seller && productResponse.seller._id) {
        productResponse.seller._id = productResponse.seller._id.toString();
      }
      
      res.json({ 
        message: 'Product updated successfully', 
        product: productResponse 
      });
      console.log('Response sent successfully');
    } catch (responseError) {
      console.error('Error sending response:', responseError);
      console.error('Response error stack:', responseError.stack);
      res.status(500).json({ 
        message: 'Product updated but response failed', 
        error: responseError.message 
      });
    }
  } catch (error) {
    console.error('=== PRODUCT UPDATE ERROR ===');
    console.error('Product update error:', error);
    console.error('Error stack:', error.stack);
    
    // Ensure we always return JSON, not HTML
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error updating product', error: error.message });
    }
  }
});

// Delete product
router.delete('/products/:productId', requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      const publicIds = product.images.map(img => img.public_id).filter(Boolean);
      if (publicIds.length > 0) {
        try {
          await deleteMultipleImages(publicIds);
        } catch (deleteError) {
          console.error('Error deleting images from Cloudinary:', deleteError);
        }
      }
    }

    await Product.findByIdAndDelete(productId);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Product deletion error:', error);
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
});

// ==================== WEBSITE MANAGEMENT ====================

// Get website settings
router.get('/website-settings', requireAdmin, async (req, res) => {
  try {
    let settings = await WebsiteSettings.findOne();
    
    if (!settings) {
      // Create default settings if none exist
      settings = new WebsiteSettings({
        heroImages: [
          { id: 1, url: '', title: 'Hero Image 1', description: 'First hero image', order: 1, isActive: true },
          { id: 2, url: '', title: 'Hero Image 2', description: 'Second hero image', order: 2, isActive: true },
          { id: 3, url: '', title: 'Hero Image 3', description: 'Third hero image', order: 3, isActive: true }
        ],
        featuredCategories: [
          { id: 1, name: 'Men', icon: '👨', color: 'bg-blue-500', order: 1, isActive: true },
          { id: 2, name: 'Women', icon: '👩', color: 'bg-pink-500', order: 2, isActive: true },
          { id: 3, name: 'Kids', icon: '👶', color: 'bg-green-500', order: 3, isActive: true },
          { id: 4, name: 'Accessories', icon: '👜', color: 'bg-purple-500', order: 4, isActive: true }
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
      });
      await settings.save();
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching website settings:', error);
    res.status(500).json({ message: 'Error fetching website settings', error: error.message });
  }
});

// Update website settings
router.post('/website-settings', requireAdmin, async (req, res) => {
  try {
    const { heroImages, featuredCategories, websiteSettings, announcements } = req.body;
    
    console.log('Updating website settings:', {
      heroImages: heroImages?.length,
      featuredCategories: featuredCategories?.length,
      announcements: announcements?.length
    });

    // Find existing settings or create new ones
    let settings = await WebsiteSettings.findOne();
    
    if (!settings) {
      settings = new WebsiteSettings();
    }

    // Update the settings
    settings.heroImages = heroImages || [];
    settings.featuredCategories = featuredCategories || [];
    settings.websiteSettings = websiteSettings || {};
    settings.announcements = announcements || [];

    await settings.save();
    
    console.log('Website settings saved to database successfully');
    
    res.json({ 
      message: 'Website settings updated successfully',
      settings: settings
    });
  } catch (error) {
    console.error('Error updating website settings:', error);
    res.status(500).json({ message: 'Error updating website settings', error: error.message });
  }
});

// Upload image for website settings
router.post('/upload-image', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    console.log('File received:', req.file);

    // For now, just return the local file path
    // In production, you'd want to use Cloudinary or another CDN
    const imageUrl = `/uploads/${req.file.filename}`;
    
    res.json({ 
      message: 'Image uploaded successfully',
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    
    // Clean up temp file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting temp file:', unlinkError);
      }
    }
    
    res.status(500).json({ message: 'Error uploading image: ' + error.message });
  }
});

// ==================== ORDER MANAGEMENT ====================

// Get all orders with pagination
router.get('/orders', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || '';

    const query = {};
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// Update order status
router.patch('/orders/:orderId/status', requireAdmin, async (req, res) => {
  try {
    const { status, trackingNumber } = req.body;
    const { orderId } = req.params;

    const updateData = { status };
    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      updateData,
      { new: true }
    ).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ 
      message: 'Order status updated successfully', 
      order 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
});

// ==================== CATEGORY MANAGEMENT ====================

// Get all categories
router.get('/categories', requireAdmin, async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

// Create category
router.post('/categories', requireAdmin, async (req, res) => {
  try {
    const { name, description, image } = req.body;

    const category = new Category({
      name,
      description,
      image
    });

    await category.save();
    res.status(201).json({ message: 'Category created successfully', category });
  } catch (error) {
    res.status(500).json({ message: 'Error creating category', error: error.message });
  }
});

// Update category
router.put('/categories/:categoryId', requireAdmin, async (req, res) => {
  try {
    const { name, description, image } = req.body;
    const { categoryId } = req.params;

    const category = await Category.findByIdAndUpdate(
      categoryId,
      { name, description, image },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category updated successfully', category });
  } catch (error) {
    res.status(500).json({ message: 'Error updating category', error: error.message });
  }
});

// Delete category
router.delete('/categories/:categoryId', requireAdmin, async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Check if category has products
    const productsCount = await Product.countDocuments({ category: categoryId });
    if (productsCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete category. ${productsCount} products are associated with this category.` 
      });
    }

    const category = await Category.findByIdAndDelete(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting category', error: error.message });
  }
});

// ==================== ANALYTICS ====================

// Get sales analytics
router.get('/analytics/sales', requireAdmin, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const salesData = await Order.aggregate([
      {
        $match: {
          status: { $in: ['completed', 'delivered'] },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(salesData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sales analytics', error: error.message });
  }
});

// Get top products analytics
router.get('/analytics/top-products', requireAdmin, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);

    res.json(topProducts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching top products analytics', error: error.message });
  }
});

module.exports = router;

