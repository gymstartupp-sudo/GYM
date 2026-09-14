const express = require('express');
const router = express.Router();
const customMessageController = require('../controllers/customMessageController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadCampaignMedia } = require('../middleware/upload');

router.use(protect);
router.use(authorize('owner', 'superadmin'));

// Middleware to check if user has 'Custom Messages' permission (except Master Admin)
const checkPermission = (req, res, next) => {
  if (req.user.isMasterAdmin) return next();
  if (req.user.allowedTabs && req.user.allowedTabs.includes('Custom Messages')) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'You do not have permission to access Custom Messages' });
};

router.post('/send', checkPermission, uploadCampaignMedia.single('media'), customMessageController.sendCampaign);

module.exports = router;
