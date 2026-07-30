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

// Environment Guard for Developer Tools
const devEnvGuard = (req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ success: false, message: 'Developer tools are only available in development environment' });
  }
  next();
};

router.get('/dashboard', adminController.getDashboardStats);
router.get('/gyms', adminController.getAllGyms);
router.get('/gym/:id/profile', adminController.getGymProfile);
router.put('/gym/:id/status', adminController.toggleGymStatus);
router.delete('/gym/:id', adminController.deleteGym);
router.post('/bulk-import', adminController.bulkImportClients);

// Heavy operations: rate-limited + concurrency guard
router.post('/overdue-check', heavyOperationLimiter, heavyConcurrencyGuard, adminController.triggerOverdueCheck);
router.post('/run-reminders', heavyOperationLimiter, heavyConcurrencyGuard, adminController.triggerRunReminders);

// Reminder Testing Developer Tools Routes
router.get('/reminder-test/clients', adminController.getReminderTestClients);
router.post('/reminder-test/send', adminController.sendTestReminder);
router.post('/reminder-test/run-cron', adminController.runTestCron);
router.get('/reminder-test/history', adminController.getReminderHistory);
router.post('/reminder-test/clear-history', adminController.clearReminderHistory);

module.exports = router;
