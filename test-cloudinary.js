require('dotenv').config();
const cloudinary = require('./config/cloudinary');

async function testCloudinary() {
  try {
    console.log('🔍 Testing Cloudinary configuration...');
    console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('API Key:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing');
    
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.log('\n❌ Missing Cloudinary credentials!');
      console.log('Please add them to your .env file:');
      console.log('CLOUDINARY_CLOUD_NAME=your_cloud_name');
      console.log('CLOUDINARY_API_KEY=your_api_key');
      console.log('CLOUDINARY_API_SECRET=your_api_secret');
      return;
    }

    // Test Cloudinary connection
    console.log('\n🔄 Testing Cloudinary connection...');
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful!');
    console.log('Response:', result);
    
    console.log('\n🎉 Cloudinary is ready to use!');
    console.log('You can now upload images through your admin panel.');
    
  } catch (error) {
    console.error('❌ Cloudinary test failed:', error.message);
    console.log('\nPlease check your credentials and try again.');
  }
}

testCloudinary();

