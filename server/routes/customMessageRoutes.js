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

router.get('/history', checkPermission, customMessageController.getCampaignHistory);
router.post('/templates', checkPermission, uploadCampaignMedia.single('media'), customMessageController.saveTemplate);
router.get('/templates', checkPermission, customMessageController.getTemplates);
router.delete('/templates/:id', checkPermission, customMessageController.deleteTemplate);
router.put('/templates/:id', checkPermission, uploadCampaignMedia.single('media'), customMessageController.updateTemplate);

module.exports = router;
