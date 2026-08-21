const mongoose = require('mongoose');

const activeSessionSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  role: { 
    type: String, 
    required: true 
  },
  sessionId: { 
    type: String, 
    required: true 
  },
  gymId: { 
    type: String, 
    default: null 
  },
  lastSeen: { 
    type: Date, 
    default: Date.now 
  },
  expiresAt: { 
    type: Date, 
    required: true,
    index: { expires: '1m' } // TTL index automatically purges expired records
  }
}, { timestamps: true });

// Compound index for fast active session lookups per account
activeSessionSchema.index({ userId: 1, role: 1 });

module.exports = mongoose.model('ActiveSession', activeSessionSchema);
