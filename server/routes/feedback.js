const express = require('express');
const { param } = require('express-validator');
const router = express.Router();
const { submitFeedback, getClientFeedback, getGymFeedback, updateFeedbackStatus } = require('../controllers/feedbackController');
const { protect } = require('../middleware/authMiddleware');
const {
  validate,
  mongoIdValidation,
  stringValidation
} = require('../middleware/validate');

const submitFeedbackValidation = [
  stringValidation('message'),
  stringValidation('subject', true)
];

const updateFeedbackValidation = [
  mongoIdValidation('id', 'param'),
  stringValidation('status')
];

// Route for clients to submit feedback
router.post('/submit', protect, submitFeedbackValidation, validate, submitFeedback);

// Route for clients to get their own feedback history
router.get('/client', protect, getClientFeedback);

// Route for owners to view all feedback for their gym
router.get('/gym/:gymId', protect, [param('gymId').isString().trim().notEmpty()], validate, getGymFeedback);

// Route for owners to update the status of a specific feedback
router.put('/:id/status', protect, updateFeedbackValidation, validate, updateFeedbackStatus);

module.exports = router;
