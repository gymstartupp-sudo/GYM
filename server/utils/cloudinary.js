const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Uploads a local file to Cloudinary and deletes the local temporary file.
 * @param {string} filePath - Path to the local file
 * @returns {Promise<string>} Secure URL of the uploaded image
 */
const uploadLogoToCloudinary = async (filePath) => {
  if (!filePath) {
    throw new Error('File path is required for Cloudinary upload');
  }

  try {
    // Check if file exists locally
    if (!fs.existsSync(filePath)) {
      throw new Error(`Local file not found at: ${filePath}`);
    }

    // Upload to Cloudinary under folder "gym_logos"
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'gym_logos',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      resource_type: 'image'
    });

    // Clean up local temp file asynchronously
    fs.unlink(filePath, (err) => {
      if (err) console.error(`Failed to delete local temp file at ${filePath}:`, err);
    });

    return result.secure_url;
  } catch (error) {
    // Ensure we attempt to clean up local file even if upload fails
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) console.error(`Failed to delete local temp file on upload error at ${filePath}:`, err);
      });
    }
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

module.exports = {
  uploadLogoToCloudinary
};
