const cloudinary = require('../config/cloudinary');

// Upload single image to Cloudinary
const uploadImage = async (file) => {
  try {
    console.log('Starting image upload to Cloudinary...');
    console.log('File info:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Convert buffer to base64
    const b64 = Buffer.from(file.buffer).toString('base64');
    const dataURI = `data:${file.mimetype};base64,${b64}`;
    
    console.log('Uploading to Cloudinary...');
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'thrifty-clothings/products',
      transformation: [
        { width: 800, height: 800, crop: 'limit' }, // Resize for optimization
        { quality: 'auto' } // Auto optimize quality
      ]
    });

    console.log('Cloudinary upload successful:', {
      url: result.secure_url,
      public_id: result.public_id
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode
    });
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

// Upload multiple images to Cloudinary
const uploadMultipleImages = async (files) => {
  try {
    const uploadPromises = files.map(file => uploadImage(file));
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw new Error('Failed to upload images');
  }
};

// Delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw new Error('Failed to delete image');
  }
};

// Delete multiple images from Cloudinary
const deleteMultipleImages = async (publicIds) => {
  try {
    const deletePromises = publicIds.map(publicId => deleteImage(publicId));
    const results = await Promise.all(deletePromises);
    return results;
  } catch (error) {
    console.error('Error deleting multiple images:', error);
    throw new Error('Failed to delete images');
  }
};

module.exports = {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages
};
