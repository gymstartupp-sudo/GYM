const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

router.use(protect, authorize('superadmin'));

router.get('/dashboard', adminController.getDashboardStats);
router.get('/gyms', adminController.getAllGyms);
router.get('/gym/:id/profile', adminController.getGymProfile);
router.put('/gym/:id/status', adminController.toggleGymStatus);
router.delete('/gym/:id', adminController.deleteGym);
router.post('/overdue-check', adminController.triggerOverdueCheck);

module.exports = router;
