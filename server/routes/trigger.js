const express = require('express');
const router = express.Router();
const { runReminders } = require('../jobs/reminderJob');
const { runOverdueReminders } = require('../jobs/overdueReminderJob');

// @desc    Trigger Reminder Job manually
// @route   POST /api/trigger/reminders
// @access  Public (for testing/manual trigger as requested)
router.post('/reminders', async (req, res, next) => {
  try {
    console.log('Manual trigger for reminder jobs initiated.');
    // Run asynchronously to not block the response if it takes long,
    // but the user wants to see it run. Let's await it so they know when it finishes.
    await runReminders();
    await runOverdueReminders();
    res.status(200).json({ success: true, message: 'All reminder jobs executed successfully.' });
  } catch (err) {
    console.error('Error running manual reminder job:', err);
    res.status(500).json({ success: false, message: 'Failed to run reminder job', error: err.message });
  }
});

// @desc    Check overdue reminders (GET - browser clickable)
// @route   GET /api/trigger/check-overdue
// @access  Public
router.get('/check-overdue', async (req, res, next) => {
  try {
    await runOverdueReminders();
    res.status(200).json({ success: true, message: 'Overdue reminder check completed.' });
  } catch (err) {
    console.error('Error running overdue check:', err);
    res.status(500).json({ success: false, message: 'Failed to run overdue check', error: err.message });
  }
});

// @desc    Check membership expiry reminders (GET - browser clickable)
// @route   GET /api/trigger/check-expiry
// @access  Public
router.get('/check-expiry', async (req, res, next) => {
  try {
    await runReminders();
    res.status(200).json({ success: true, message: 'Expiry reminder check completed.' });
  } catch (err) {
    console.error('Error running expiry check:', err);
    res.status(500).json({ success: false, message: 'Failed to run expiry check', error: err.message });
  }
});

module.exports = router;
