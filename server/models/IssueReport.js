const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  from: { type: String, enum: ['admin', 'system'], default: 'admin' },
  message: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

const noteSchema = new mongoose.Schema({
  message: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

const issueReportSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true
  },
  gymId: { type: String, required: true, trim: true },
  gymName: { type: String, required: true, trim: true },
  ownerName: { type: String, trim: true },
  ownerEmail: { type: String, trim: true },
  ownerPhone: { type: String, trim: true },

  category: {
    type: String,
    enum: ['Bug', 'Feature Request', 'Billing', 'Member Management', 'WhatsApp Notifications', 'Payments', 'Other'],
    required: true
  },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },

  screenshots: [{ type: String }], // relative paths like /uploads/issues/...
  video: { type: String },          // relative path

  // Technical info (auto-captured from browser)
  browser: { type: String, trim: true },
  operatingSystem: { type: String, trim: true },
  resolution: { type: String, trim: true },
  currentPage: { type: String, trim: true },
  appVersion: { type: String, trim: true, default: '1.0.0' },

  // Admin fields
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed'],
    default: 'Open'
  },
  assignedTo: { type: String, trim: true },
  adminNotes: [noteSchema],
  replies: [replySchema]
}, { timestamps: true });

issueReportSchema.index({ gymId: 1, createdAt: -1 });
issueReportSchema.index({ status: 1 });
issueReportSchema.index({ severity: 1 });

module.exports = mongoose.model('IssueReport', issueReportSchema, 'issueReports');
