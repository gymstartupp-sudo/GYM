require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const compression = require('compression');

// Import Middlewares
const { errorHandler } = require('./middleware/errorHandler');

// Import Models
const Admin = require('./models/Admin');

const app = express();

app.use(compression({ level: 6 }));
// Middleware
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
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

// Health Check
app.get("/", (req, res) => res.send("API running"));

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

// Error Handler Middleware
app.use(errorHandler);


const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
// Trigger reload for new query fields
