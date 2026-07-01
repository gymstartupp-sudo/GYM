const mongoose = require('mongoose');
const { createTenantModelProxy } = require('../utils/tenantContext');

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  value: { type: Number, default: 0 }
}, { timestamps: true });

const Counter = createTenantModelProxy('Counter', counterSchema);
Counter.schema = counterSchema;

module.exports = Counter;

