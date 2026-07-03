const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const { getTenantConnection } = require('../utils/connectionManager');

async function main() {
  let uri = process.env.MONGODB_URI;
  console.log('Connecting to:', uri);
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
  console.log('Resolved URI:', uri);
  try {
    await mongoose.connect(uri);
    console.log('Connected successfully!');
  } catch (err) {
    console.error('Connection failed:', err);
    return;
  }

  // We know the tenant DB from earlier tests or we can find active gyms
  const Gym = require('../models/Gym');
  const gyms = await Gym.find({}).lean();
  
  for (const gym of gyms) {
    console.log(`\n=== Gym: ${gym.gymName} (${gym.gymId}) ===`);
    const conn = await getTenantConnection(gym.dbName);
    const Client = conn.model('Client');
    const Plan = conn.model('Plan');
    
    const plans = await Plan.find({ isActive: true }).lean();
    console.log('Active Plans:');
    plans.forEach(p => {
      console.log(`Plan ID: ${p._id}, Name: ${gName = p.name}, Duration: ${p.durationMonths}`);
    });
    
    const clients = await Client.find({ isDeleted: { $ne: true } }).lean();
    console.log(`Total non-deleted clients: ${clients.length}`);
    
    // Sample a few clients to see their membership fields
    clients.slice(0, 5).forEach(c => {
      console.log(`Client: ${c.personalInfo.name} (${c.clientId})`);
      console.log(`  isActive: ${c.isActive}`);
      console.log(`  membership:`, JSON.stringify(c.membership, null, 2));
    });
  }

  await mongoose.disconnect();
}
main();
