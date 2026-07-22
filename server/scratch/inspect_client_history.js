const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const { getTenantConnection } = require('../utils/connectionManager');

async function main() {
  let uri = process.env.MONGODB_URI;
  if (uri && !uri.includes('/platform_db')) {
    const url = require('url');
    try {
      const parsed = new url.URL(uri);
      parsed.pathname = '/platform_db';
      uri = parsed.toString();
    } catch (e) {}
  }
  
  await mongoose.connect(uri);
  const Gym = require('../models/Gym');
  const gym = await Gym.findOne({ gymId: 'NEX-29' }).lean();
  
  if (!gym) {
    console.error('Gym NEX-29 not found.');
    return;
  }

  const conn = await getTenantConnection(gym.dbName);
  const Client = conn.model('Client', require('../models/Client').schema);

  const client = await Client.findOne({ clientId: 'CL-08' }).lean();
  if (!client) {
    console.error('Client CL-08 not found.');
  } else {
    console.log(JSON.stringify(client, null, 2));
  }

  await mongoose.disconnect();
}

main();
