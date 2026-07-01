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

  if (tenantConnections.has(dbName)) {
    const conn = tenantConnections.get(dbName);
    if (conn.readyState === 1) {
      return conn;
    }
    tenantConnections.delete(dbName);
  }

  const uri = getTenantDbUri(dbName);
  const conn = mongoose.createConnection(uri);

  await new Promise((resolve, reject) => {
    conn.once('open', resolve);
    conn.once('error', reject);
  });

  tenantConnections.set(dbName, conn);

  // Pre-register all schemas on this connection
  // Note: Import the files dynamically to avoid circular dependency
  conn.model('Client', require('../models/Client').schema);
  conn.model('Plan', require('../models/Plan').schema);
  conn.model('Payment', require('../models/Payment').schema);
  conn.model('Expense', require('../models/Expense').schema);
  conn.model('Feedback', require('../models/Feedback').schema);
  conn.model('Counter', require('../models/Counter').schema);
  conn.model('Setting', require('../models/Setting').schema);

  return conn;
};

module.exports = {
  getTenantConnection,
  getTenantDbUri
};
