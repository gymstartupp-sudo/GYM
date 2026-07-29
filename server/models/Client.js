const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const clientSchema = new mongoose.Schema({
  clientId: { type: String, trim: true },
  gymId: { type: String },
  gymName: { type: String },
  personalInfo: {
    name: { type: String, required: true, maxlength: 50 },
    dob: { type: Date, required: true },
    gender: { type: String, required: true },
    address: { type: String, required: true, maxlength: 100 },
    city: { type: String, maxlength: 25 },
    state: { type: String, maxlength: 25 },
    pincode: { type: String, maxlength: 6 },
    email: { type: String, required: true, unique: true, maxlength: 50 },
    mobileNo: { type: String, required: true, unique: true },
    emergencyContact: { type: String },
    medicalCondition: { type: String, maxlength: 100 },
    whatsappNumber: { type: String }
  },
  whatsappNumber: { type: String },
  expiryReminderSent: { type: Boolean, default: false },
  expiredReminderSent: { type: Boolean, default: false },
  expiryReminderStatus: { type: String, enum: ['none', 'sent', 'failed', 'pending'], default: 'none' },
  expiredReminderStatus: { type: String, enum: ['none', 'sent', 'failed', 'pending'], default: 'none' },
  expiryReminderError: { type: String, default: null },
  expiredReminderError: { type: String, default: null },
  expiryReminderSentAt: { type: Date, default: null },
  expiredReminderSentAt: { type: Date, default: null },
  password: { type: String, required: true },
  memberships: [{
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    planName: { type: String },
    planDurationMonths: { type: Number },
    startDate: { type: Date },
    endDate: { type: Date },
    finalPrice: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    dueDate: { type: Date }
  }],
  paymentStatus: {
    type: String,
    enum: ['paid', 'partial', 'overdue'],
    default: 'paid'
  },
  membership: {
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    planName: { type: String },
    planDurationMonths: { type: Number },
    customMonths: { type: Number },
    durationMonths: { type: Number }, // Keeping for backward compatibility
    startDate: { type: Date },
    endDate: { type: Date },
    daysLeft: { type: Number },
    status: { type: String, enum: ['active', 'expired', 'expiring_soon', 'upcoming', 'pending'] },
    requestApproved: { type: Boolean, default: false },
    expiryReminderSent: { type: Boolean, default: false },
    expiredReminderSent: { type: Boolean, default: false },
    expiryReminderStatus: { type: String, enum: ['none', 'sent', 'failed', 'pending'], default: 'none' },
    expiredReminderStatus: { type: String, enum: ['none', 'sent', 'failed', 'pending'], default: 'none' },
    expiryReminderError: { type: String, default: null },
    expiredReminderError: { type: String, default: null },
    expiryReminderSentAt: { type: Date, default: null },
    expiredReminderSentAt: { type: Date, default: null }
  },
  overdueReminders: {
    reminder1: {
      status: { type: String, enum: ['none', 'sent', 'failed', 'pending'], default: 'none' },
      sentAt: { type: Date, default: null },
      error: { type: String, default: null }
    },
    reminder2: {
      status: { type: String, enum: ['none', 'sent', 'failed', 'pending'], default: 'none' },
      sentAt: { type: Date, default: null },
      error: { type: String, default: null }
    },
    reminder3: {
      status: { type: String, enum: ['none', 'sent', 'failed', 'pending'], default: 'none' },
      sentAt: { type: Date, default: null },
      error: { type: String, default: null }
    },
    manualReminders: [{
      sentAt: { type: Date },
      status: { type: String, enum: ['sent', 'failed'] },
      error: { type: String, default: null },
      reminderType: { type: String },
      templateName: { type: String },
      executionSource: { type: String, enum: ['Automatic Cron', 'Manual Trigger', 'Manual Reminder', 'Manual Admin Trigger'] },
      messageId: { type: String },
      sentBy: { type: String }
    }],
    workflowCompleted: { type: Boolean, default: false },
    duesClearedAt: { type: Date, default: null }
  },
  paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }],
  avatar: { type: String },
  hasPartialPayment: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  deactivatedAt: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, default: null }
}, { timestamps: true });

clientSchema.index(
  { clientId: 1 },
  { 
    unique: true, 
    partialFilterExpression: { clientId: { $exists: true } } 
  }
);
clientSchema.index({ isActive: 1 });
clientSchema.index({ isActive: 1, paymentStatus: 1 });

clientSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$') || this.password.startsWith('$2y$')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

clientSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const { createTenantModelProxy } = require('../utils/tenantContext');
const Client = createTenantModelProxy('Client', clientSchema);
Client.schema = clientSchema;
module.exports = Client;
