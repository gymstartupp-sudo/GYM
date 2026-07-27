const mongoose = require('mongoose');

const passwordResetOTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true,
    index: true
  },
  phone: {
    type: String,
    required: false,
    trim: true,
    index: true
  },
  otpHash: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// TTL Index: automatically delete document after 5 minutes (300 seconds)
passwordResetOTPSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

module.exports = mongoose.model('PasswordResetOTP', passwordResetOTPSchema);
