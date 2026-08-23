require('dotenv').config();
const dns = require('dns');
// Windows local DNS resolvers frequently return ECONNREFUSED for SRV queries (_mongodb._tcp).
// Use Cloudflare & Google public DNS by default unless DNS_SERVERS env is explicitly set.
const customDns = process.env.DNS_SERVERS
  ? process.env.DNS_SERVERS.split(',').map(s => s.trim()).filter(Boolean)
  : ['1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4'];
try {
  dns.setServers(customDns);
} catch (e) {
  // Fallback to system DNS if setting custom servers fails
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const logger = require('./utils/logger');

// Import Middlewares
const { errorHandler } = require('./middleware/errorHandler');
const { blockNoSqlInjection } = require('./middleware/security');


const app = express();
// Trust Render's reverse proxy (required for express-rate-limit)
app.set("trust proxy", 1);

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

// Webhook Route (bypass sanitization and tenant middleware)
app.use('/api/webhook', require('./routes/webhook'));

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
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

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
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });
    logger.info('MongoDB Connected to database:', mongoose.connection.name);
  } catch (error) {
    logger.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
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

// Global API Rate Limiter — applies to all authenticated routes below
const { apiLimiter } = require('./middleware/rateLimiter');
app.use('/api', apiLimiter);

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

// Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
};

startServer();
