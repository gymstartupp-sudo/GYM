const mongoose = require('mongoose');
const { createTenantModelProxy } = require('../utils/tenantContext');

const planSchema = new mongoose.Schema({
  gymId: { type: String },
  name: { type: String, required: true },
  durationMonths: { type: Number, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  isCustom: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  partialPaymentDueDays: { type: Number, default: 15 },
  normalizedName: { type: String, trim: true, lowercase: true }
}, { timestamps: true });

// Pre-validate hook to normalize plan name
planSchema.pre('validate', function(next) {
  if (this.name) {
    this.normalizedName = this.name.trim().replace(/\s+/g, ' ').toLowerCase();
  }
  next();
});

// Enforce unique name among active plans (case-insensitive via normalizedName)
planSchema.index({ normalizedName: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

// Enforce unique duration among active standard plans
planSchema.index({ durationMonths: 1 }, { unique: true, partialFilterExpression: { isCustom: false, isActive: true } });

const Plan = createTenantModelProxy('Plan', planSchema);
Plan.schema = planSchema;

module.exports = Plan;

