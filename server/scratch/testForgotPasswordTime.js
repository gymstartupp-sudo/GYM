require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Gym = require('../models/Gym');
const Admin = require('../models/Admin');
const { getTenantConnection } = require('../utils/connectionManager');
const { getTenantConnection: getTenantConnectionOpt } = require('./connectionManagerOpt');

const testTime = async () => {
  try {
    let uri = process.env.MONGODB_URI;
    if (uri && !uri.includes('/platform_db')) {
      const url = require('url');
      try {
        const parsed = new url.URL(uri);
        parsed.pathname = '/platform_db';
        uri = parsed.toString();
      } catch (e) {
        if (uri.includes('?')) {
          uri = uri.replace(/\/[^/?]*\?/, '/platform_db?');
        } else {
          uri = uri.endsWith('/') ? uri + 'platform_db' : uri + '/platform_db';
        }
      }
    }
    console.log('Connecting to database...');
    await mongoose.connect(uri);
    console.log('Connected.');

    const email = 'nonexistent_test_email_12345@gmail.com';

    // Run 1: Sequential Uncached using original connectionManager
    console.log('\n--- Run 1: Sequential Uncached (Original) ---');
    console.time('Sequential Search Original');
    let userExistsSeq = false;
    const admin = await Admin.findOne({ email }).lean();
    userExistsSeq = !!admin;
    if (!userExistsSeq) {
      const gym = await Gym.findOne({ gymEmail: email }).lean();
      userExistsSeq = !!gym;
    }
    if (!userExistsSeq) {
      const gymsList = await Gym.find({ isActive: true }).lean();
      for (const g of gymsList) {
        try {
          const conn = await getTenantConnection(g.dbName);
          const TenantClient = conn.model('Client');
          const client = await TenantClient.findOne({ 'personalInfo.email': email }).lean();
          if (client) {
            userExistsSeq = true;
            break;
          }
        } catch (err) {
          console.error(err);
        }
      }
    }
    console.timeEnd('Sequential Search Original');

    // Close and reconnect to clear mongoose connection cache
    await mongoose.connection.close();
    await mongoose.connect(uri);

    // Run 2: Parallel Uncached using original connectionManager
    console.log('\n--- Run 2: Parallel Uncached (Original) ---');
    console.time('Parallel Search Original');
    let userExistsPar = false;
    const gymsList = await Gym.find({ isActive: true }).lean();
    const results = await Promise.all(
      gymsList.map(async (g) => {
        try {
          const conn = await getTenantConnection(g.dbName);
          const TenantClient = conn.model('Client');
          const client = await TenantClient.findOne({ 'personalInfo.email': email }).lean();
          return !!client;
        } catch (err) {
          return false;
        }
      })
    );
    userExistsPar = results.some(exists => exists);
    console.timeEnd('Parallel Search Original');

    // Close and reconnect to clear mongoose connection cache
    await mongoose.connection.close();
    await mongoose.connect(uri);

    // Run 3: Parallel Uncached using OPTIMIZED connectionManager
    console.log('\n--- Run 3: Parallel Uncached (Optimized Connection + Background Migration) ---');
    console.time('Parallel Search Optimized');
    let userExistsOpt = false;
    const gymsListOpt = await Gym.find({ isActive: true }).lean();
    const resultsOpt = await Promise.all(
      gymsListOpt.map(async (g) => {
        try {
          const conn = await getTenantConnectionOpt(g.dbName);
          const TenantClient = conn.model('Client');
          const client = await TenantClient.findOne({ 'personalInfo.email': email }).lean();
          return !!client;
        } catch (err) {
          return false;
        }
      })
    );
    userExistsOpt = resultsOpt.some(exists => exists);
    console.timeEnd('Parallel Search Optimized');

    // Let any background migration logs print out before closing
    await new Promise(resolve => setTimeout(resolve, 1000));

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
};

testTime();
