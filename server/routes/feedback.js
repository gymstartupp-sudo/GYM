const express = require('express');
const router = express.Router();
const { submitFeedback, getClientFeedback, getGymFeedback, updateFeedbackStatus } = require('../controllers/feedbackController');
const { protect } = require('../middleware/authMiddleware');

// Route for clients to submit feedback
router.post('/submit', protect, submitFeedback);

// Route for clients to get their own feedback history
router.get('/client', protect, getClientFeedback);

// Route for owners to view all feedback for their gym
router.get('/gym/:gymId', protect, getGymFeedback);

// Route for owners to update the status of a specific feedback
router.put('/:id/status', protect, updateFeedbackStatus);

module.exports = router;
