const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/thrifty-clothings')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function fixPrices() {
  try {
    console.log('Starting price fix...');

    // Get all products
    const allProducts = await Product.find({});
    console.log(`Found ${allProducts.length} products`);

    // Fix each product
    for (const product of allProducts) {
      console.log(`\nProcessing product: ${product.name}`);
      console.log(`  Current price: ${product.price}`);
      console.log(`  Current basePrice: ${product.basePrice}`);
      
      const updates = {};

      // If basePrice is missing but price exists
      if (!product.basePrice && product.price) {
        const numericPrice = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
        console.log(`  - Setting basePrice: ${numericPrice}`);
        updates.basePrice = numericPrice;
      }

      // If neither exists, set a default
      if (!product.basePrice && !product.price) {
        console.log(`  - Setting default basePrice: 0`);
        updates.basePrice = 0;
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        await Product.findByIdAndUpdate(product._id, updates);
        console.log(`  ✅ Updated product: ${product.name}`);
      } else {
        console.log(`  ✅ Product already correct: ${product.name}`);
      }
    }

    console.log('\n✅ All prices fixed successfully!');
    
    // Show final summary
    const finalProducts = await Product.find({});
    console.log(`\nFinal product summary:`);
    
    for (const product of finalProducts) {
      console.log(`- ${product.name}: basePrice=${product.basePrice}, category=${product.category}`);
    }

  } catch (error) {
    console.error('Error fixing prices:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the fix
fixPrices();
