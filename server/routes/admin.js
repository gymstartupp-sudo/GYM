const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

router.use(protect, authorize('superadmin', 'developer'));

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
router.post('/overdue-check', adminController.triggerOverdueCheck);
router.post('/bulk-import', adminController.bulkImportClients);
router.post('/run-reminders', adminController.triggerRunReminders);

// Reminder Testing Developer Tools Routes
router.get('/reminder-test/clients', devEnvGuard, adminController.getReminderTestClients);
router.post('/reminder-test/send', devEnvGuard, adminController.sendTestReminder);
router.post('/reminder-test/run-cron', devEnvGuard, adminController.runTestCron);
router.get('/reminder-test/history', devEnvGuard, adminController.getReminderHistory);
router.post('/reminder-test/clear-history', devEnvGuard, adminController.clearReminderHistory);

module.exports = router;
