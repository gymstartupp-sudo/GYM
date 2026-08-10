const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const gymSchema = new mongoose.Schema({
  gymId: { type: String, required: true, unique: true, trim: true },
  gymName: { type: String, required: true, maxlength: 35 },
  gymEmail: { type: String, required: true, unique: true },
  gymContact: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  owner: {
    name: { type: String, required: true, maxlength: 50 },
    email: { type: String, required: true, trim: true },
    mobile: { type: String, trim: true },
    phone: { type: String, trim: true }
  },
  address: { type: String, required: true, maxlength: 100 },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true, maxlength: 6 },
  gst: { type: String, default: "", maxlength: 15 },
  gymLogo: { type: String, default: "" },
  tagline: { type: String, default: "", maxlength: 35 },
  gymType: { type: String, default: "", maxlength: 35 },
  operatingDays: [{ type: String }],
  operatingHours: {
    open: { type: String, default: "" },
    close: { type: String, default: "" }
  },
  billingInfo: {
    billingIdPrefix: { type: String, default: 'BILL', maxlength: 5 },
    helpContact: { type: String, default: "" },
    addressOnBill: { type: String, default: "", maxlength: 100 },
    regards: { type: String, default: "", maxlength: 35 },
    greetingText: { type: String, default: "", maxlength: 35 },
    allowPartialPayments: { type: Boolean, default: true }
  },
  reminderSettings: {
    whatsappNumber: { type: String, default: "" },
    gmail: { type: String, default: "" },
    phoneNumber: { type: String, default: "" }
  },
  socialMediaLinks: [{ platform: String, url: String }],
  dbName: { type: String, required: true },
  status: { type: String, default: 'Active' },
  subscription: { type: String, default: 'Premium' },
  isActive: { type: Boolean, default: true }
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

