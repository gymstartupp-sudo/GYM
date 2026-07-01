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
  partialPaymentDueDays: { type: Number, default: 15 }
}, { timestamps: true });

const Plan = createTenantModelProxy('Plan', planSchema);
Plan.schema = planSchema;

module.exports = Plan;

