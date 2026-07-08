require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Gym = require('../models/Gym');
const { getTenantConnection } = require('../utils/connectionManager');

let uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI is not defined in the environment variables.');
  process.exit(1);
}

if (!uri.includes('/platform_db')) {
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

async function run() {
  console.log('🚀 Connecting to main database:', uri.replace(/:([^:@]+)@/, ':****@'));
  await mongoose.connect(uri);
  console.log('✅ Connected to main database.');

  const gyms = await Gym.find().lean();
  console.log(`ℹ️ Found ${gyms.length} gyms in the database.`);

  for (const gym of gyms) {
    console.log(`\nScanning gym: ${gym.gymName} (${gym.gymId}) - DB: ${gym.dbName}`);
    try {
      const conn = await getTenantConnection(gym.dbName);
      const TenantClient = conn.model('Client');

      // Find clients who are not deleted, not approved, but also not active
      const query = {
        isDeleted: { $ne: true },
        'membership.requestApproved': false,
        isActive: false
      };

      const stuckClients = await TenantClient.find(query).lean();
      if (stuckClients.length === 0) {
        console.log('  ✅ No stuck pending clients found.');
        continue;
      }

      console.log(`  ⚠️ Found ${stuckClients.length} stuck pending clients:`);
      for (const client of stuckClients) {
        console.log(`    - Name: ${client.personalInfo?.name}, Phone: ${client.personalInfo?.mobileNo || client.whatsappNumber}`);
        
        await TenantClient.updateOne(
          { _id: client._id },
          { $set: { isActive: true } }
        );
        console.log(`      ✅ Updated isActive to true.`);
      }
    } catch (err) {
      console.error(`  ❌ Error processing gym ${gym.gymId}:`, err);
    }
  }

  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from database. Done.');
}

run().catch(err => {
  console.error('❌ Script failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
