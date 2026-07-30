require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Gym = require('../models/Gym');
const Admin = require('../models/Admin');
const PasswordResetOTP = require('../models/PasswordResetOTP');
const { getTenantConnection } = require('../utils/connectionManager');
const { getTenantConnection: getTenantConnectionOpt } = require('./connectionManagerOpt');

// Mock req, res, next
const makeMocks = () => {
  return {
    req: {
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      body: { email: 'nonexistent_test_email_12345@gmail.com' }
    },
    res: {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    },
    next(err) {
      console.error('Next called with error:', err);
    }
  };
};

const runOriginal = async () => {
  const { req, res, next } = makeMocks();
  const { email } = req.body;

  let userExists = false;

  const admin = await Admin.findOne({ email }).lean();
  userExists = !!admin;

  if (!userExists) {
    const gym = await Gym.findOne({ gymEmail: email }).lean();
    userExists = !!gym;
  }

  if (!userExists) {
    const gymsList = await Gym.find({ isActive: true }).lean();
    for (const g of gymsList) {
      try {
        const conn = await getTenantConnection(g.dbName);
        const TenantClient = conn.model('Client');
        const client = await TenantClient.findOne({ 'personalInfo.email': email }).lean();
        if (client) {
          userExists = true;
          break;
        }
      } catch (err) {
        console.error(err);
      }
    }
  }

  // Simulate OTP gen and response
  const crypto = require('crypto');
  const otp = crypto.randomInt(100000, 999999).toString();
  const bcrypt = require('bcryptjs');
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await PasswordResetOTP.deleteMany({ email });
  await PasswordResetOTP.create({ email, otpHash, expiresAt });

  res.status(200).json({ success: true, message: 'Done' });
};

const runOptimized = async () => {
  const { req, res, next } = makeMocks();
  const { email } = req.body;

  let userExists = false;

  const [admin, gym] = await Promise.all([
    Admin.findOne({ email }).lean(),
    Gym.findOne({ gymEmail: email }).lean()
  ]);
  userExists = !!admin || !!gym;

  if (!userExists) {
    const gymsList = await Gym.find({ isActive: true }).lean();
    const results = await Promise.all(
      gymsList.map(async (g) => {
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
    userExists = results.some(exists => exists);
  }

  // Simulate OTP gen and response
  const crypto = require('crypto');
  const otp = crypto.randomInt(100000, 999999).toString();
  const bcrypt = require('bcryptjs');
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await PasswordResetOTP.deleteMany({ email });
  await PasswordResetOTP.create({ email, otpHash, expiresAt });

  res.status(200).json({ success: true, message: 'Done' });
};

const test = async () => {
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

  console.log('\n--- Run 1 (Original Uncached) ---');
  console.time('Original Time');
  await runOriginal();
  console.timeEnd('Original Time');

  // Close and reconnect to clear cache
  await mongoose.connection.close();
  await mongoose.connect(uri);

  console.log('\n--- Run 2 (Optimized Uncached) ---');
  console.time('Optimized Time');
  await runOptimized();
  console.timeEnd('Optimized Time');

  // Wait for background tasks to finish
  await new Promise(resolve => setTimeout(resolve, 1000));

  await mongoose.connection.close();
  process.exit(0);
};

test();
