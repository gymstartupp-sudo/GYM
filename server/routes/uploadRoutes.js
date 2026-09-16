const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadBufferToCloudinary } = require('../utils/cloudinary');
const { protect } = require('../middleware/authMiddleware');

// Use memory storage for multer to avoid saving files locally
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// @desc    Upload avatar image directly to Cloudinary
// @route   POST /api/upload/avatar
// @access  Public (for client registration) & Private (for owners adding clients)
router.post('/avatar', upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const secureUrl = await uploadBufferToCloudinary(req.file.buffer, 'gym_avatars');
    
    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: { url: secureUrl }
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload avatar' });
  }
});

module.exports = router;
