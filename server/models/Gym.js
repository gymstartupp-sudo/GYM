const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const gymSchema = new mongoose.Schema({
  gymId: { type: String, required: true, unique: true, trim: true },
  gymName: { type: String, required: true, maxlength: 35 },
  gymEmail: { type: String, required: true, unique: true },
  gymContact: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  owner: {
    name: { type: String, required: true, maxlength: 35 },
    email: { type: String, required: true, trim: true },
    mobile: { type: String, trim: true }
  },
  address: { type: String, required: true, maxlength: 100 },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true, maxlength: 6 },
  gst: { type: String, default: "", maxlength: 15 },
  gymLogo: { type: String, default: "" },
  tagline: { type: String, default: "", maxlength: 30 },
  gymType: { type: String, default: "", maxlength: 50 },
  operatingDays: [{ type: String }],
  operatingHours: {
    open: { type: String, default: "" },
    close: { type: String, default: "" }
  },
  billingInfo: {
    billingIdPrefix: { type: String, default: 'BILL', maxlength: 5 },
    helpContact: { type: String, default: "" },
    addressOnBill: { type: String, default: "", maxlength: 35 },
    regards: { type: String, default: "", maxlength: 35 },
    allowPartialPayments: { type: Boolean, default: true }
  },
  socialMediaLinks: [{ platform: String, url: String }],
  alternateContacts: { type: String, default: "" },
  googleReviewLink: { type: String, default: "" },
  dbName: { type: String, required: true },
  requestApproved: { type: Boolean, default: false },
  status: { type: String, default: 'Pending' },
  isActive: { type: Boolean, default: false },
  adminConfig: {
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    password: { type: String },
    allowedTabs: [{ type: String, default: ['Dashboard', 'Clients', 'Inactive Clients', 'Deleted Clients', 'Plans', 'Clients Payment', 'Dues', 'Expired', 'Payment Ledger', 'Requests', 'Feedback', 'Staff', 'Leads', 'Custom Messages'] }]
  }
}, { timestamps: true });

gymSchema.pre('save', async function (next) {
  const salt = await bcrypt.genSalt(10);

  if (this.isModified('password') && this.password && !this.password.startsWith('$2')) {
    this.password = await bcrypt.hash(this.password, salt);
  }

  if (this.isModified('adminConfig.password') && this.adminConfig?.password && !this.adminConfig.password.startsWith('$2')) {
    this.adminConfig.password = await bcrypt.hash(this.adminConfig.password, salt);
  }

  next();
});

gymSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

gymSchema.methods.matchAdminPassword = async function (enteredPassword) {
  if (!this.adminConfig?.password) return false;
  return await bcrypt.compare(enteredPassword, this.adminConfig.password);
};

module.exports = mongoose.model('Gym', gymSchema);

