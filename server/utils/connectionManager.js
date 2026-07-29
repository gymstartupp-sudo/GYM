const mongoose = require('mongoose');

// Cache of tenant connections: dbName -> Connection
const tenantConnections = new Map();

const getTenantDbUri = (dbName) => {
  const baseUri = process.env.MONGODB_URI;
  if (!baseUri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }
  if (baseUri.includes('?')) {
    return baseUri.replace(/\/[^/?]*\?/, `/${dbName}?`);
  } else {
    return baseUri.endsWith('/') ? baseUri + dbName : baseUri + '/' + dbName;
  }
};

const getTenantConnection = async (dbName) => {
  if (!dbName) {
    throw new Error('Database name is required for tenant connection');
  }

  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database is not connected');
  }

  if (tenantConnections.has(dbName)) {
    const conn = tenantConnections.get(dbName);
    if (conn.readyState === 1) {
      return conn;
    }
    tenantConnections.delete(dbName);
  }

  const conn = mongoose.connection.useDb(dbName, { useCache: true });
  tenantConnections.set(dbName, conn);

  // Pre-register all schemas on this connection using safe model check
  // Note: Import the files dynamically to avoid circular dependency
  const Client = conn.models.Client || conn.model('Client', require('../models/Client').schema);
  const PlanModel = conn.models.Plan || conn.model('Plan', require('../models/Plan').schema);
  const Payment = conn.models.Payment || conn.model('Payment', require('../models/Payment').schema);
  const Expense = conn.models.Expense || conn.model('Expense', require('../models/Expense').schema);
  const Feedback = conn.models.Feedback || conn.model('Feedback', require('../models/Feedback').schema);
  const Counter = conn.models.Counter || conn.model('Counter', require('../models/Counter').schema);
  const Setting = conn.models.Setting || conn.model('Setting', require('../models/Setting').schema);

  // Migration: Populate normalizedName and deactivate duplicate active plans to avoid unique index build failures
  try {
    const plans = await PlanModel.find({ isActive: true }).lean();
    const seenNames = new Set();
    const seenDurations = new Set();

    for (const plan of plans) {
      const normName = plan.name ? plan.name.trim().replace(/\s+/g, ' ').toLowerCase() : '';
      
      if (plan.normalizedName !== normName) {
        await PlanModel.updateOne({ _id: plan._id }, { $set: { normalizedName: normName } });
      }

      // Check name duplication among active plans
      if (seenNames.has(normName)) {
        await PlanModel.updateOne({ _id: plan._id }, { $set: { isActive: false } });
        continue;
      }
      seenNames.add(normName);

      // Check standard plan duration duplication
      if (!plan.isCustom) {
        if (seenDurations.has(plan.durationMonths)) {
          await PlanModel.updateOne({ _id: plan._id }, { $set: { isActive: false } });
          continue;
        }
        seenDurations.add(plan.durationMonths);
      }
    }

    // Also populate normalizedName for any inactive plans that are missing it
    const unpopulatedInactive = await PlanModel.find({ isActive: { $ne: true }, normalizedName: { $exists: false } }).lean();
    for (const plan of unpopulatedInactive) {
      if (plan.name) {
        const norm = plan.name.trim().replace(/\s+/g, ' ').toLowerCase();
        await PlanModel.updateOne({ _id: plan._id }, { $set: { normalizedName: norm } });
      }
    }
  } catch (err) {
    console.error(`Error running plan normalizedName migration for ${dbName}:`, err);
  }

  return conn;
};

module.exports = {
  getTenantConnection,
  getTenantDbUri
};
