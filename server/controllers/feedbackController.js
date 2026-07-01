const Feedback = require('../models/Feedback');

// @desc    Submit new feedback
// @route   POST /api/feedback/submit
// @access  Private (Client)
const submitFeedback = async (req, res) => {
  try {
    const { subject, message } = req.body;
    const clientObjectId = req.user._id;
    const gymId = req.user.gymId;
    const clientId = req.user.clientId;
    const clientName = req.user.personalInfo?.name;
    const clientAvatar = req.user.avatar;

    if (!gymId) {
      return res.status(400).json({ message: 'Gym association not found for this client' });
    }

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const feedback = new Feedback({
      gymId,
      clientObjectId,
      clientId,
      clientName,
      clientAvatar,
      subject,
      message,
      status: 'Unread'
    });

    await feedback.save();

    res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all feedback for the logged-in client
// @route   GET /api/feedback/client
// @access  Private (Client)
const getClientFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ clientObjectId: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json(feedbacks);
  } catch (error) {
    console.error('Error fetching client feedback:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all feedback for a gym
// @route   GET /api/feedback/gym/:gymId
// @access  Private (Owner/Admin)
const getGymFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({})
      .sort({ createdAt: -1 });

    res.status(200).json(feedbacks);
  } catch (error) {
    console.error('Error fetching gym feedback:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update feedback status
// @route   PUT /api/feedback/:id/status
// @access  Private (Owner/Admin)
const updateFeedbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Unread', 'Read', 'Resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const feedback = await Feedback.findById(id);

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    feedback.status = status;
    if (status === 'Read') {
      feedback.readAt = new Date();
    } else if (status === 'Resolved') {
      feedback.resolvedAt = new Date();
    }

    await feedback.save();

    res.status(200).json({ message: 'Feedback status updated', feedback });
  } catch (error) {
    console.error('Error updating feedback status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  submitFeedback,
  getClientFeedback,
  getGymFeedback,
  updateFeedbackStatus
};
