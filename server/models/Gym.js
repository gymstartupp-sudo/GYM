const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const gymSchema = new mongoose.Schema({
  gymId: { type: String, required: true, unique: true, trim: true },
  gymIdPrefix: { type: String },
  gymName: { type: String, required: true, maxlength: 20 },
  gst: { type: String },
  tagline: { type: String, maxlength: 20 },
  address: { type: String, required: true, maxlength: 100 },
  location: { type: String, required: true, maxlength: 20 },
  gymEmail: { type: String, required: true, unique: true },
  gymContact: { type: String, required: true, unique: true },
  socialMediaLinks: [{ platform: String, url: String }],
  gymType: { type: String, maxlength: 20 },
  operatingDays: [{ type: String }],
  operatingHours: {
    open: { type: String },
    close: { type: String }
  },
  password: { type: String, required: true },
  billingInfo: {
    billingIdPrefix: { type: String, maxlength: 5 },
    helpContact: String,
    gst: String,
    logo: String,
    addressOnBill: { type: String, maxlength: 100 },
    regards: { type: String, maxlength: 50 },
    greetingText: { type: String, maxlength: 50 },
    invoiceSupportEmail: { type: String, trim: true },
    allowPartialPayments: { type: Boolean, default: true }
  },
  reminderSettings: {
    whatsappNumber: String,
    gmail: String,
    phoneNumber: String
  },
  isActive: { type: Boolean, default: true },
  gymLogo: { type: String, default: "" }
}, { timestamps: true });


gymSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$') || this.password.startsWith('$2y$')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

gymSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Gym', gymSchema);
