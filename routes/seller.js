const express = require('express');
const router = express.Router();
const { requireSeller } = require('../middleware/admin');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Category = require('../models/Category');

// ==================== SELLER DASHBOARD ====================

// Get seller dashboard stats
router.get('/dashboard', requireSeller, async (req, res) => {
  try {
    const sellerId = req.user._id;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Product stats
    const totalProducts = await Product.countDocuments({ seller: sellerId });
    const activeProducts = await Product.countDocuments({ 
      seller: sellerId, 
      isActive: true 
    });
    const lowStockProducts = await Product.countDocuments({
      seller: sellerId,
      'variants.stock': { $lt: 10 }
    });

    // Order stats
    const totalOrders = await Order.countDocuments({
      'items.product': { $in: await Product.find({ seller: sellerId }).select('_id') }
    });

    const monthlyOrders = await Order.countDocuments({
      'items.product': { $in: await Product.find({ seller: sellerId }).select('_id') },
      createdAt: { $gte: startOfMonth }
    });

    // Revenue stats
    const sellerOrders = await Order.find({
      'items.product': { $in: await Product.find({ seller: sellerId }).select('_id') },
      status: { $in: ['completed', 'delivered'] }
    });

    const totalRevenue = sellerOrders.reduce((sum, order) => {
      const sellerItems = order.items.filter(item => 
        order.sellerProducts?.includes(item.product.toString())
      );
      return sum + sellerItems.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
    }, 0);

    const monthlyRevenue = sellerOrders
      .filter(order => order.createdAt >= startOfMonth)
      .reduce((sum, order) => {
        const sellerItems = order.items.filter(item => 
          order.sellerProducts?.includes(item.product.toString())
        );
        return sum + sellerItems.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
      }, 0);

    // Recent orders
    const recentOrders = await Order.find({
      'items.product': { $in: await Product.find({ seller: sellerId }).select('_id') }
    })
      .populate('user', 'name email')
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .limit(10);

    // Top selling products
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      { $match: { 'product.seller': sellerId } },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          product: { $first: '$product' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      stats: {
        totalProducts,
        activeProducts,
        lowStockProducts,
        totalOrders,
        monthlyOrders,
        totalRevenue,
        monthlyRevenue
      },
      recentOrders,
      topProducts
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching seller dashboard', error: error.message });
  }
});

// ==================== SELLER PRODUCT MANAGEMENT ====================

// Get seller's products
router.get('/products', requireSeller, async (req, res) => {
  try {
    const sellerId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const status = req.query.status || '';

    const query = { seller: sellerId };
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (category) {
      query.category = category;
    }
    if (status) {
      query.isActive = status === 'active';
    }

    const products = await Product.find(query)
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// Create new product
router.post('/products', requireSeller, async (req, res) => {
  try {
    const sellerId = req.user._id;
    const productData = {
      ...req.body,
      seller: sellerId
    };

    const product = new Product(productData);
    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name');

    res.status(201).json({ 
      message: 'Product created successfully', 
      product: populatedProduct 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
});

// Update product
router.put('/products/:productId', requireSeller, async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { productId } = req.params;

    // Verify product belongs to seller
    const existingProduct = await Product.findOne({ 
      _id: productId, 
      seller: sellerId 
    });

    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found or access denied' });
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      req.body,
      { new: true }
    ).populate('category', 'name');

    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});

// Delete product
router.delete('/products/:productId', requireSeller, async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { productId } = req.params;

    // Verify product belongs to seller
    const product = await Product.findOne({ 
      _id: productId, 
      seller: sellerId 
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or access denied' });
    }

    await Product.findByIdAndDelete(productId);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
});

// Update product stock
router.patch('/products/:productId/stock', requireSeller, async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { productId } = req.params;
    const { variants } = req.body;

    // Verify product belongs to seller
    const product = await Product.findOne({ 
      _id: productId, 
      seller: sellerId 
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or access denied' });
    }

    // Update variants stock
    product.variants = variants;
    await product.save();

    res.json({ message: 'Stock updated successfully', product });
  } catch (error) {
    res.status(500).json({ message: 'Error updating stock', error: error.message });
  }
});

// ==================== SELLER ORDER MANAGEMENT ====================

// Get seller's orders
router.get('/orders', requireSeller, async (req, res) => {
  try {
    const sellerId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || '';

    // Get seller's product IDs
    const sellerProductIds = await Product.find({ seller: sellerId }).select('_id');

    const query = {
      'items.product': { $in: sellerProductIds }
    };
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

// Update order status (for seller's products)
router.patch('/orders/:orderId/status', requireSeller, async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { orderId } = req.params;
    const { status, trackingNumber } = req.body;

    // Get seller's product IDs
    const sellerProductIds = await Product.find({ seller: sellerId }).select('_id');

    const order = await Order.findOne({
      _id: orderId,
      'items.product': { $in: sellerProductIds }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or access denied' });
    }

    // Update only seller's items in the order
    order.items.forEach(item => {
      if (sellerProductIds.some(id => id.toString() === item.product.toString())) {
        item.status = status;
        if (trackingNumber) {
          item.trackingNumber = trackingNumber;
        }
      }
    });

    await order.save();

    const populatedOrder = await Order.findById(orderId)
      .populate('user', 'name email')
      .populate('items.product', 'name images');

    res.json({ 
      message: 'Order status updated successfully', 
      order: populatedOrder 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
});

// ==================== SELLER EARNINGS ====================

// Get seller earnings
router.get('/earnings', requireSeller, async (req, res) => {
  try {
    const sellerId = req.user._id;
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

    // Get seller's product IDs
    const sellerProductIds = await Product.find({ seller: sellerId }).select('_id');

    const earnings = await Order.aggregate([
      {
        $match: {
          'items.product': { $in: sellerProductIds },
          status: { $in: ['completed', 'delivered'] },
          createdAt: { $gte: startDate }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.product': { $in: sellerProductIds }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          totalEarnings: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(earnings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching earnings', error: error.message });
  }
});

// Get seller profile
router.get('/profile', requireSeller, async (req, res) => {
  try {
    const seller = await User.findById(req.user._id)
      .select('-password')
      .populate('sellerProfile');

    res.json(seller);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching seller profile', error: error.message });
  }
});

// Update seller profile
router.put('/profile', requireSeller, async (req, res) => {
  try {
    const { sellerProfile } = req.body;

    const seller = await User.findByIdAndUpdate(
      req.user._id,
      { sellerProfile },
      { new: true }
    ).select('-password');

    res.json({ message: 'Profile updated successfully', seller });
  } catch (error) {
    res.status(500).json({ message: 'Error updating seller profile', error: error.message });
  }
});

// ==================== SELLER REGISTRATION ====================

// Apply to become a seller
router.post('/apply', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const { sellerProfile } = req.body;

    // Update user role and seller profile
    user.role = 'seller';
    user.sellerProfile = {
      ...sellerProfile,
      isApproved: false
    };

    await user.save();

    res.json({ 
      message: 'Seller application submitted successfully. Pending admin approval.',
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting seller application', error: error.message });
  }
});

module.exports = router;


