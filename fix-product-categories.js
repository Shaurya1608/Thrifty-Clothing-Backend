const mongoose = require('mongoose');
const Product = require('./models/Product');
const Category = require('./models/Category');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/thrifty-clothings')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function fixProductCategories() {
  try {
    console.log('Starting to fix product categories...');

    // First, ensure we have categories in the database
    let categories = await Category.find({});
    
    if (categories.length === 0) {
      console.log('No categories found, creating default categories...');
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
      console.log('Created categories:', categories.map(c => ({ name: c.name, id: c._id })));
    }

    // Create a mapping of category names to ObjectIds
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name.toLowerCase()] = cat._id;
      categoryMap[cat.name] = cat._id;
    });

    console.log('Category mapping:', categoryMap);

    // Find all products with string category values
    const productsWithStringCategories = await Product.find({
      category: { $type: 'string' }
    });

    console.log(`Found ${productsWithStringCategories.length} products with string categories`);

    // Update each product
    for (const product of productsWithStringCategories) {
      const oldCategory = product.category;
      console.log(`Processing product "${product.name}" with category: "${oldCategory}"`);
      
      if (oldCategory && typeof oldCategory === 'string') {
        const newCategoryId = categoryMap[oldCategory.toLowerCase()] || categoryMap[oldCategory];
        
        if (newCategoryId) {
          console.log(`Updating product "${product.name}": "${oldCategory}" -> ${newCategoryId}`);
          await Product.findByIdAndUpdate(product._id, {
            category: newCategoryId
          });
        } else {
          console.log(`No matching category found for "${oldCategory}", using first category as fallback`);
          await Product.findByIdAndUpdate(product._id, {
            category: categories[0]._id
          });
        }
      } else {
        console.log(`Product "${product.name}" has invalid category: ${oldCategory}, using first category as fallback`);
        await Product.findByIdAndUpdate(product._id, {
          category: categories[0]._id
        });
      }
    }

    // Also fix any products with string price values
    const productsWithStringPrice = await Product.find({
      price: { $type: 'string' }
    });

    console.log(`Found ${productsWithStringPrice.length} products with string price`);

    for (const product of productsWithStringPrice) {
      console.log(`Updating product "${product.name}": price "${product.price}" -> ${parseFloat(product.price)}`);
      await Product.findByIdAndUpdate(product._id, {
        basePrice: parseFloat(product.price)
      });
    }

    console.log('✅ Product categories and prices fixed successfully!');
    
    // Show final count
    const totalProducts = await Product.countDocuments();
    console.log(`Total products in database: ${totalProducts}`);

  } catch (error) {
    console.error('Error fixing product categories:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the fix
fixProductCategories();
