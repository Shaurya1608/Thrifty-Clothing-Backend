const mongoose = require('mongoose');
const Product = require('./models/Product');
const Category = require('./models/Category');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/thrifty-clothings')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function fixAllProducts() {
  try {
    console.log('Starting comprehensive product fix...');

    // Get or create categories
    let categories = await Category.find({});
    
    if (categories.length === 0) {
      console.log('Creating default categories...');
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
      
      categories = await Category.find({});
    }

    console.log(`Found ${categories.length} categories`);
    const defaultCategoryId = categories[0]._id;

    // Get all products
    const allProducts = await Product.find({});
    console.log(`Found ${allProducts.length} products to process`);

    // Fix each product
    for (const product of allProducts) {
      console.log(`\nProcessing product: ${product.name}`);
      
      const updates = {};

      // Fix category
      if (!product.category || typeof product.category === 'string') {
        console.log(`  - Fixing category: ${product.category} -> ${defaultCategoryId}`);
        updates.category = defaultCategoryId;
      }

      // Fix price
      if (product.price && typeof product.price === 'string') {
        const numericPrice = parseFloat(product.price);
        console.log(`  - Fixing price: "${product.price}" -> ${numericPrice}`);
        updates.basePrice = numericPrice;
      } else if (!product.basePrice && product.price) {
        console.log(`  - Moving price to basePrice: ${product.price}`);
        updates.basePrice = product.price;
      }

      // Fix stock
      if (product.stock && typeof product.stock === 'string') {
        const numericStock = parseInt(product.stock);
        console.log(`  - Fixing stock: "${product.stock}" -> ${numericStock}`);
        updates.stock = numericStock;
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        await Product.findByIdAndUpdate(product._id, updates);
        console.log(`  ✅ Updated product: ${product.name}`);
      } else {
        console.log(`  ✅ Product already correct: ${product.name}`);
      }
    }

    console.log('\n✅ All products fixed successfully!');
    
    // Show final summary
    const finalProducts = await Product.find({});
    console.log(`\nFinal product count: ${finalProducts.length}`);
    
    for (const product of finalProducts) {
      console.log(`- ${product.name}: category=${product.category}, basePrice=${product.basePrice}`);
    }

  } catch (error) {
    console.error('Error fixing products:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the fix
fixAllProducts();
