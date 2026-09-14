const mongoose = require('mongoose');
const { createTenantModelProxy } = require('../utils/tenantContext');

const staffSchema = new mongoose.Schema({
  gymId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  role: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    maxlength: 15
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 100
  },
  dob: {
    type: Date
  },
  address: {
    type: String,
    trim: true,
    maxlength: 300
  },
  salary: {
    type: Number,
    min: 0,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const Staff = createTenantModelProxy('Staff', staffSchema);
Staff.schema = staffSchema;

module.exports = Staff;
