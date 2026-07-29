const mongoose = require('mongoose');

// Define Lock Schema
const lockSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 60 } // automatically deleted after 60 seconds by MongoDB
});

// Avoid schema recompilation issues
const Lock = mongoose.models.Lock || mongoose.model('Lock', lockSchema);

/**
 * Acquire a lock for a given key.
 * Returns true if lock was acquired successfully, false if already locked.
 * Uses atomic findOneAndUpdate upsert.
 * @param {string} key 
 * @returns {Promise<boolean>}
 */
const acquireLock = async (key) => {
  const now = new Date();
  const staleThreshold = new Date(Date.now() - 60000); // 60 seconds

  try {
    // Upsert lock. Will match if:
    // 1) The lock doesn't exist (causes upsert)
    // 2) The lock exists but is older than 60 seconds (causes update)
    // If it exists and is fresh, query filter doesn't match and MongoDB tries to insert a new doc,
    // which triggers duplicate key error (11000) on unique _id index.
    await Lock.findOneAndUpdate(
      {
        _id: key,
        $or: [
          { createdAt: { $lt: staleThreshold } }
        ]
      },
      {
        $setOnInsert: { _id: key },
        $set: { createdAt: now }
      },
      {
        upsert: true,
        new: true
      }
    );
    return true;
  } catch (err) {
    if (err.code === 11000) {
      return false;
    }
    throw err;
  }
};

/**
 * Release a lock for a given key.
 * @param {string} key 
 * @returns {Promise<void>}
 */
const releaseLock = async (key) => {
  try {
    await Lock.deleteOne({ _id: key });
  } catch (err) {
    console.error(`Error releasing lock for key ${key}:`, err);
  }
};

module.exports = {
  acquireLock,
  releaseLock
};
