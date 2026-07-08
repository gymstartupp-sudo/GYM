/**
 * DATABASE MIGRATION SCRIPT: Fixes clientId values in Payment collections
 * Updates seeded Payments (which have clientId like 'CL-XX') to use the client's Mongo _id string.
 * Run with: node scripts/fix_payment_client_ids.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function run() {
  console.log('Starting client payment ID repair...');
  
  let uri = process.env.MONGODB_URI;
  if (!uri.includes('/platform_db')) {
    if (uri.includes('?')) {
      uri = uri.replace(/\/[^/?]*\?/, '/platform_db?');
    } else {
      uri = uri.endsWith('/') ? uri + 'platform_db' : uri + '/platform_db';
    }
  }

  await mongoose.connect(uri);
  console.log('✅ Connected to platform_db\n');

  const GymModel = mongoose.models.Gym || mongoose.model('Gym', require('../models/Gym').schema);
  const { getTenantConnection } = require('../utils/connectionManager');

  const gyms = await GymModel.find({});
  console.log(`Found ${gyms.length} gyms to audit.`);

  for (const gym of gyms) {
    console.log(`\n━━━ Auditing Gym ${gym.gymName} (${gym.gymId}) ━━━`);
    const tenantConn = await getTenantConnection(gym.dbName);

    const ClientModel = tenantConn.models.Client || tenantConn.model('Client', require('../models/Client').schema);
    const PaymentModel = tenantConn.models.Payment || tenantConn.model('Payment', require('../models/Payment').schema);

    // Find payments that use sequence CL-XX instead of ObjectId
    const payments = await PaymentModel.find({ clientId: /^CL-/ });
    if (payments.length === 0) {
      console.log('  No payment repairs needed.');
      continue;
    }

    console.log(`  Found ${payments.length} payments to fix.`);

    let updatedCount = 0;
    for (const p of payments) {
      const client = await ClientModel.findOne({ clientId: p.clientId });
      if (client) {
        p.clientId = client._id.toString();
        // Update idempotency key accordingly
        p.idempotencyKey = `seed-${gym.gymId}-${client._id.toString()}-${p.paymentId}`;
        await p.save();
        updatedCount++;
      } else {
        console.warn(`  ⚠️ Could not find client matching clientId ${p.clientId} for payment ${p.paymentId}`);
      }
    }
    console.log(`  Fixed ${updatedCount} payments.`);
  }

  await mongoose.disconnect();
  console.log('\n✅ Repaired all payment client IDs successfully.');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Migration failed:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
