const mongoose = require('mongoose');
const { createTenantModelProxy } = require('../utils/tenantContext');

const settingSchema = new mongoose.Schema({
  partialPayment: {
    enabled: { type: Boolean, default: true },
    minimumPercentage: { type: Number, default: 50 }
  },
  dueSettings: {
    defaultDaysFor1To6Months: { type: Number, default: 15 },
    defaultDaysAbove6Months: { type: Number, default: 30 },
    allowCustomDueDays: { type: Boolean, default: true },
    customPlanDueDays: {
      type: Map,
      of: Number,
      default: {
        "1 Month": 15,
        "2 Months": 15,
        "3 Months": 15,
        "6 Months": 15,
        "12 Months": 30
      }
    }
  }
}, { timestamps: true });

const Setting = createTenantModelProxy('Setting', settingSchema);
Setting.schema = settingSchema;

module.exports = Setting;
