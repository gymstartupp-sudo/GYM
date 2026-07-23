const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Gym = require('../models/Gym');
const { getTenantConnection } = require('../utils/connectionManager');

const check = async () => {
  try {
    let uri = process.env.MONGODB_URI;
    if (uri && !uri.includes('/platform_db')) {
      const url = require('url');
      try {
        const parsed = new url.URL(uri);
        parsed.pathname = '/platform_db';
        uri = parsed.toString();
      } catch (e) {
        uri = uri.replace(/\/[^/?]*\?/, '/platform_db?');
      }
    }
    await mongoose.connect(uri);

    const gym = await Gym.findOne({ dbName: 'gym_NEX_29' });
    const conn = await getTenantConnection(gym.dbName);
    const ClientModel = conn.models.Client || conn.model('Client', require('../models/Client').schema);

    // List all clients and their active status, isDeleted, etc.
    const clients = await ClientModel.find().lean();
    console.log(`Total clients in database: ${clients.length}`);
    for (const c of clients) {
      console.log(`Client: ID=${c.clientId}, name=${c.personalInfo.name}, email=${c.personalInfo.email}, mobileNo=${c.personalInfo.mobileNo}, isDeleted=${c.isDeleted}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

check();
