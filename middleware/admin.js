const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    console.log('=== ADMIN MIDDLEWARE ===');
    console.log('Headers:', req.headers);
    
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('Token received:', token ? 'Yes' : 'No');
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded, userId:', decoded.userId);
    
    const user = await User.findById(decoded.userId);
    console.log('User found:', user ? 'Yes' : 'No', 'Role:', user?.role);

    if (!user) {
      console.log('User not found');
      return res.status(401).json({ message: 'Invalid token.' });
    }

    if (user.role !== 'admin') {
      console.log('User is not admin, role:', user.role);
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    console.log('Admin access granted for user:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    if (!res.headersSent) {
      res.status(401).json({ message: 'Invalid token.' });
    }
  }
};

// Middleware to check if user is admin or seller
const requireAdminOrSeller = async (req, res, next) => {
  try {
    console.log('requireAdminOrSeller middleware called');
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    console.log('Token received:', token ? 'Yes' : 'No');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded, userId:', decoded.userId);
    
    const user = await User.findById(decoded.userId);
    console.log('User found:', user ? 'Yes' : 'No', 'Role:', user?.role);

    if (!user) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    if (user.role !== 'admin' && user.role !== 'seller') {
      return res.status(403).json({ message: 'Access denied. Admin or seller privileges required.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Middleware error:', error);
    if (!res.headersSent) {
      res.status(401).json({ message: 'Invalid token.' });
    }
  }
};

// Middleware to check if user is seller (for seller-specific operations)
const requireSeller = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    if (user.role !== 'seller' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Seller privileges required.' });
    }

    // If user is seller, check if they're approved
    if (user.role === 'seller' && !user.sellerProfile?.isApproved) {
      return res.status(403).json({ message: 'Your seller account is pending approval.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (!res.headersSent) {
      res.status(401).json({ message: 'Invalid token.' });
    }
  }
};

module.exports = {
  requireAdmin,
  requireAdminOrSeller,
  requireSeller
};

