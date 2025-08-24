const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploaded images)
app.use('/uploads', express.static('uploads'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Set default JWT_SECRET if not provided
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';
  console.log('Warning: Using default JWT_SECRET. Please set JWT_SECRET in .env for production.');
}

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/thrifty-clothings')
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.log('MongoDB not available - running without database');
  console.log('To connect to MongoDB, install it locally or provide MONGODB_URI in .env');
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth', require('./routes/firebase-auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/user-profile', require('./routes/userProfile'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/seller', require('./routes/seller'));

// Public website settings endpoint
app.get('/api/website-settings', async (req, res) => {
  try {
    const WebsiteSettings = require('./models/WebsiteSettings');
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'THRIFTY CLOTHINGS API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
