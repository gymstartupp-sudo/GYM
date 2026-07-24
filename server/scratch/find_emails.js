const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/GYM/server/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Gym owners
    const Gym = require('../models/Gym');
    const gyms = await Gym.find({}).lean();
    console.log('--- Gym Owner Emails ---');
    gyms.forEach(g => {
      console.log(`Gym: ${g.gymName}, Email: ${g.gymEmail}, Contact: ${g.gymContact}`);
    });

    // 2. Admins
    const Admin = require('../models/Admin');
    const admins = await Admin.find({}).lean();
    console.log('--- Admin Emails ---');
    admins.forEach(a => {
      console.log(`Admin Email: ${a.email}`);
    });

    // 3. Client across tenant DBs
    console.log('--- Client Emails ---');
    const { getTenantConnection } = require('../utils/connectionManager');
    for (const g of gyms) {
      try {
        const conn = await getTenantConnection(g.dbName);
        const TenantClient = conn.model('Client');
        const clients = await TenantClient.find({}).lean();
        clients.forEach(c => {
          console.log(`Gym: ${g.gymName}, Client Name: ${c.personalInfo?.name}, Email: ${c.personalInfo?.email}, Phone: ${c.personalInfo?.mobileNo}`);
        });
      } catch (err) {
        console.error(`Error for ${g.dbName}:`, err);
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
