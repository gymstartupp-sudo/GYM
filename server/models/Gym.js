const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const gymSchema = new mongoose.Schema({
  gymId: { type: String, required: true, unique: true, trim: true },
  gymName: { type: String, required: true, maxlength: 35 },
  gst: { type: String, maxlength: 15 },
  tagline: { type: String, maxlength: 35 },
  address: { type: String, required: true, maxlength: 100 },
  state: { type: String, required: true, maxlength: 25 },
  city: { type: String, required: true, maxlength: 25 },
  pincode: { type: String, required: true, maxlength: 6 },
  gymEmail: { type: String, required: true, unique: true },
  gymContact: { type: String, required: true, unique: true },
  socialMediaLinks: [{ platform: String, url: String }],
  gymType: { type: String, maxlength: 35 },
  operatingDays: [{ type: String }],
  operatingHours: {
    open: { type: String },
    close: { type: String }
  },
  password: { type: String, required: true },
  owner: {
    name: { type: String, required: true, maxlength: 50 },
    email: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true }
  },
  billingInfo: {
    billingIdPrefix: { type: String, maxlength: 5 },
    helpContact: String,
    addressOnBill: { type: String, maxlength: 100 },
    regards: { type: String, maxlength: 35 },
    greetingText: { type: String, maxlength: 35 },
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
