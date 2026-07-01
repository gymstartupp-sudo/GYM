/**
 * Migration Script: Migrate from Single Shared DB to Multi-Tenant Databases
 *
 * This script:
 *   1. Connects to the original GYM database.
 *   2. Connects to platform_db database.
 *   3. Copies gyms and superAdmins to platform_db.
 *   4. For each gym, connects to its isolated database (gym_NEX_XX) and copies clients, plans, payments, expenses, feedbacks, counters, and creates settings.
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in .env file.');
  process.exit(1);
}

// Helper to construct connection URI for a specific DB
const getDbUri = (dbName) => {
  let uri = MONGODB_URI;
  if (uri.includes('?')) {
    return uri.replace(/\/[^/?]*\?/, `/${dbName}?`);
  } else {
    return uri.endsWith('/') ? uri + dbName : uri + '/' + dbName;
  }
};

async function runMigration() {
  console.log('🚀 Connecting to original GYM database...');
  const gymConn = await mongoose.createConnection(getDbUri('GYM')).asPromise();
  console.log('✅ Connected to original GYM database.');

  console.log('🚀 Connecting to platform_db...');
  const platformConn = await mongoose.createConnection(getDbUri('platform_db')).asPromise();
  console.log('✅ Connected to platform_db.');

  // Fetch gyms from original DB
  const rawGyms = await gymConn.collection('gyms').find({}).toArray();
  console.log(`Found ${rawGyms.length} gyms to migrate.`);

  // Migrate gyms to platform_db
  if (rawGyms.length > 0) {
    await platformConn.collection('gyms').deleteMany({});
    // Format dbName in gyms metadata
    const formattedGyms = rawGyms.map(gym => {
      const dbName = `gym_${gym.gymId.replace('-', '_')}`;
      return {
        ...gym,
        dbName,
        isActive: gym.isActive !== undefined ? gym.isActive : true,
        status: gym.status || 'Active',
        subscription: gym.subscription || 'Premium'
      };
    });
    await platformConn.collection('gyms').insertMany(formattedGyms);
    console.log('✅ Migrated gyms to platform_db.');
  }

  // Migrate admins/superAdmins to platform_db
  const rawAdmins = await gymConn.collection('admins').find({}).toArray();
  if (rawAdmins.length > 0) {
    await platformConn.collection('superAdmins').deleteMany({});
    await platformConn.collection('superAdmins').insertMany(rawAdmins);
    console.log(`✅ Migrated ${rawAdmins.length} superAdmins to platform_db.`);
  }

  // Iterate over each gym and migrate their tenant-specific collections
  for (const gym of rawGyms) {
    const dbName = `gym_${gym.gymId.replace('-', '_')}`;
    console.log(`\n📦 Migrating data for Gym: ${gym.gymName} (${gym.gymId}) to database: ${dbName}...`);

    const tenantConn = await mongoose.createConnection(getDbUri(dbName)).asPromise();

    // 1. Settings Collection Seeding
    await tenantConn.collection('settings').deleteMany({});
    await tenantConn.collection('settings').insertOne({
      gst: gym.gst || '',
      tagline: gym.tagline || '',
      address: gym.address || '',
      state: gym.state || '',
      city: gym.city || '',
      pincode: gym.pincode || '',
      socialMediaLinks: gym.socialMediaLinks || [],
      gymType: gym.gymType || 'Unisex',
      operatingDays: gym.operatingDays || [],
      operatingHours: gym.operatingHours || {},
      gymLogo: gym.gymLogo || '',
      billingInfo: gym.billingInfo || {
        billingIdPrefix: 'BILL',
        helpContact: '',
        addressOnBill: '',
        regards: '',
        greetingText: ''
      },
      reminderSettings: gym.reminderSettings || {
        whatsappNumber: '',
        gmail: '',
        phoneNumber: ''
      }
    });
    console.log('  ✅ Created Settings document.');

    // 2. Migrate Clients
    const clients = await gymConn.collection('clients').find({ gymId: gym.gymId }).toArray();
    if (clients.length > 0) {
      await tenantConn.collection('clients').deleteMany({});
      await tenantConn.collection('clients').insertMany(clients);
      console.log(`  ✅ Migrated ${clients.length} clients.`);
    }

    // 3. Migrate Plans
    const plans = await gymConn.collection('plans').find({ gymId: gym.gymId }).toArray();
    if (plans.length > 0) {
      await tenantConn.collection('plans').deleteMany({});
      await tenantConn.collection('plans').insertMany(plans);
      console.log(`  ✅ Migrated ${plans.length} plans.`);
    }

    // 4. Migrate Payments
    const payments = await gymConn.collection('payments').find({ gymId: gym.gymId }).toArray();
    if (payments.length > 0) {
      await tenantConn.collection('payments').deleteMany({});
      await tenantConn.collection('payments').insertMany(payments);
      console.log(`  ✅ Migrated ${payments.length} payments.`);
    }

    // 5. Migrate Expenses
    const expenses = await gymConn.collection('expenses').find({ gymId: gym.gymId }).toArray();
    if (expenses.length > 0) {
      await tenantConn.collection('expenses').deleteMany({});
      await tenantConn.collection('expenses').insertMany(expenses);
      console.log(`  ✅ Migrated ${expenses.length} expenses.`);
    }

    // 6. Migrate Feedbacks
    const feedbacks = await gymConn.collection('feedbacks').find({ gymId: gym.gymId }).toArray();
    if (feedbacks.length > 0) {
      await tenantConn.collection('feedbacks').deleteMany({});
      await tenantConn.collection('feedbacks').insertMany(feedbacks);
      console.log(`  ✅ Migrated ${feedbacks.length} feedbacks.`);
    }

    // 7. Migrate Counters
    const counters = await gymConn.collection('counters').find({
      name: {
        $in: [
          `clientId:${gym.gymId}`,
          new RegExp(`^paymentId:${gym.gymId}:`)
        ]
      }
    }).toArray();
    if (counters.length > 0) {
      await tenantConn.collection('counters').deleteMany({});
      await tenantConn.collection('counters').insertMany(counters);
      console.log(`  ✅ Migrated ${counters.length} counters.`);
    }

    await tenantConn.close();
  }

  await gymConn.close();
  await platformConn.close();
  console.log('\n🎉 Multi-tenant database migration completed successfully!');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
