const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  gymId: { type: String, required: true },
  name: { type: String, required: true, maxlength: 35 },
  phone: { type: String, required: true, maxlength: 10 }
}, { timestamps: true });

const { createTenantModelProxy } = require('../utils/tenantContext');
const Lead = createTenantModelProxy('Lead', leadSchema);
Lead.schema = leadSchema;
module.exports = Lead;
