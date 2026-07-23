require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

// Import Middlewares
const { errorHandler } = require('./middleware/errorHandler');
const { blockNoSqlInjection } = require('./middleware/security');

// Import Models
const Admin = require('./models/Admin');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression({ level: 6 }));
// Middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Private-Network", "true");
  next();
});
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(blockNoSqlInjection);
// Shadow req.query and req.params to make them writable for express-mongo-sanitize in Express 5
app.use((req, res, next) => {
  if (req.query) {
    let queryVal = req.query;
    Object.defineProperty(req, 'query', {
      get() { return queryVal; },
      set(val) { queryVal = val; },
      configurable: true,
      enumerable: true
    });
  }
  if (req.params) {
    let paramsVal = req.params;
    Object.defineProperty(req, 'params', {
      get() { return paramsVal; },
      set(val) { paramsVal = val; },
      configurable: true,
      enumerable: true
    });
  }
  next();
});
app.use(mongoSanitize());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
const connectDB = async () => {
  try {
    mongoose.set('strictQuery', true);
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
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log("Connected DB:", mongoose.connection.name);

    // Seed Super Admin on first run
    await seedSuperAdmin();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const seedSuperAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gymplatform.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@1234';

    const adminExists = await Admin.findOne({ email: adminEmail });
    if (!adminExists) {
      await Admin.create({
        email: adminEmail,
        password: adminPassword,
        role: 'superadmin'
      });
      console.log('Super Admin Seeded Successfully');
    }
  } catch (err) {
    console.error('Error seeding admin', err);
  }
};

// Start jobs
require('./jobs/statusUpdater');
require('./jobs/reminderJob');
require('./jobs/overdueReminderJob');

// Health Check
app.get("/", (req, res) => res.send("API running"));

// Global Tenant DB Middleware
const { tenantDbMiddleware } = require('./middleware/tenantDbMiddleware');
app.use(tenantDbMiddleware);

// Routes (to be loaded)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/gym', require('./routes/gym'));
app.use('/api/client', require('./routes/client'));
app.use('/api/plan', require('./routes/plan'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/overdue', require('./routes/overdue'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/expenses', require('./routes/expense'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/issues', require('./routes/issues'));
app.use('/api/trigger', require('./routes/trigger'));

// Error Handler Middleware
app.use(errorHandler);


const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});
// Trigger reload for new query fields - env file non-srv update
