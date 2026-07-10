const { getTenantConnection } = require('../utils/connectionManager');
const { runWithTenantContext } = require('../utils/tenantContext');
const mongoose = require('mongoose');

const tenantDbMiddleware = async (req, res, next) => {
  try {
    let dbName = null;
    let gymId = (req.headers && req.headers['x-gym-id']) || (req.query && req.query.gymId) || (req.body && req.body.gymId) || (req.params && req.params.gymId);

    // Try to extract dbName or gymId from Bearer token
    if (req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded) {
          if (decoded.dbName) {
            dbName = decoded.dbName;
          } else if (decoded.gymId && !gymId) {
            gymId = decoded.gymId;
          }
        }
      } catch (err) {
        // Silently let authMiddleware handle JWT verification issues later
      }
    }

    if (!dbName && gymId) {
      // Find the gym in platform database to get its dbName
      // Note: Gym model is on the default mongoose connection (platform_db)
      const Gym = mongoose.model('Gym');
      const gym = await Gym.findOne({ gymId: gymId.trim().toUpperCase() }).lean();
      if (gym) {
        dbName = gym.dbName;
      }
    }

    if (dbName) {
      const conn = await getTenantConnection(dbName);
      req.tenantDb = conn;

      const models = {
        Client: conn.models.Client || conn.model('Client', require('../models/Client').schema),
        Plan: conn.models.Plan || conn.model('Plan', require('../models/Plan').schema),
        Payment: conn.models.Payment || conn.model('Payment', require('../models/Payment').schema),
        Expense: conn.models.Expense || conn.model('Expense', require('../models/Expense').schema),
        Feedback: conn.models.Feedback || conn.model('Feedback', require('../models/Feedback').schema),
        Counter: conn.models.Counter || conn.model('Counter', require('../models/Counter').schema),
        Setting: conn.models.Setting || conn.model('Setting', require('../models/Setting').schema)
      };

      req.tenantModels = models;

      return runWithTenantContext({ tenantDb: conn, models }, () => {
        next();
      });
    }

    // Default: no tenant DB resolved (runs against platform_db)
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { tenantDbMiddleware };
