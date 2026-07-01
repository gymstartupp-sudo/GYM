const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  gymId: {
    type: String,
    required: true,
    ref: 'Gym'
  },
  clientObjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  clientId: {
    type: String,
    required: true,
    trim: true
  },
  clientName: {
    type: String,
    required: true,
    trim: true
  },
  clientAvatar: {
    type: String,
    trim: true
  },
  subject: {
    type: String,
    trim: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['Unread', 'Read', 'Resolved'],
    default: 'Unread'
  },
  readAt: {
    type: Date
  },
  resolvedAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
