const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');
const {
  adminLimiter,
  heavyOperationLimiter,
  heavyConcurrencyGuard
} = require('../middleware/rateLimiter');

// Apply adminLimiter to all admin routes
router.use(protect, authorize('superadmin', 'developer'), adminLimiter);


router.get('/dashboard', adminController.getDashboardStats);
router.get('/gyms', adminController.getAllGyms);
router.get('/gym/:id/profile', adminController.getGymProfile);
router.put('/gym/:id/status', adminController.toggleGymStatus);
router.delete('/gym/:id', adminController.deleteGym);
router.post('/bulk-import', adminController.bulkImportClients);

// Heavy operations: rate-limited + concurrency guard
router.post('/overdue-check', heavyOperationLimiter, heavyConcurrencyGuard, adminController.triggerOverdueCheck);
router.post('/run-reminders', heavyOperationLimiter, heavyConcurrencyGuard, adminController.triggerRunReminders);


module.exports = router;
