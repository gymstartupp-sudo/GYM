/**
 * Migration Script V2: Migrate Operational Settings to Platform DB and Restructure Tenant Settings
 *
 * This script:
 *   1. Connects to platform_db database.
 *   2. Iterates through all existing gyms.
 *   3. For each gym, connects to its isolated database (gym_NEX_XX) and reads the setting document.
 *   4. Moves gst, tagline, address, logo, operating configs, billing configs, and reminder configs into platform_db.gyms.
 *   5. Deletes old setting documents and seeds the new restricted Settings format.
 *   6. Ensures unique indexes are built inside each gym database client collection.
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
  console.log('🚀 Connecting to platform_db...');
  const platformConn = await mongoose.createConnection(getDbUri('platform_db')).asPromise();
  console.log('✅ Connected to platform_db.');

  // Fetch gyms from platform_db
  const rawGyms = await platformConn.collection('gyms').find({}).toArray();
  console.log(`Found ${rawGyms.length} gyms to update.`);

  for (const gym of rawGyms) {
    const dbName = `gym_${gym.gymId.replace('-', '_')}`;
    console.log(`\n📦 Restructuring data for Gym: ${gym.gymName} (${gym.gymId}) using database: ${dbName}...`);

    let tenantConn;
    try {
      tenantConn = await mongoose.createConnection(getDbUri(dbName)).asPromise();
    } catch (connErr) {
      console.error(`  ❌ Failed to connect to tenant database ${dbName}:`, connErr.message);
      continue;
    }

    // 1. Fetch old Settings document
    const oldSetting = await tenantConn.collection('settings').findOne({});
    if (oldSetting) {
      console.log(`  Found old settings document. Merging operational fields to Gym document...`);

      // Merge fields back into platform_db.gyms
      const updatedGymFields = {
        address: oldSetting.address || gym.address || "No Address",
        city: oldSetting.city || gym.city || "No City",
        state: oldSetting.state || gym.state || "No State",
        pincode: oldSetting.pincode || gym.pincode || "000000",
        gst: oldSetting.gst || gym.gst || "",
        gymLogo: oldSetting.gymLogo || gym.gymLogo || "",
        tagline: oldSetting.tagline || gym.tagline || "",
        gymType: oldSetting.gymType || gym.gymType || "",
        operatingDays: oldSetting.operatingDays || gym.operatingDays || [],
        operatingHours: oldSetting.operatingHours || gym.operatingHours || { open: "", close: "" },
        billingInfo: oldSetting.billingInfo || gym.billingInfo || {
          billingIdPrefix: 'BILL',
          helpContact: '',
          addressOnBill: '',
          regards: '',
          greetingText: '',
          allowPartialPayments: true
        },
        reminderSettings: oldSetting.reminderSettings || gym.reminderSettings || {
          whatsappNumber: '',
          gmail: '',
          phoneNumber: ''
        },
        socialMediaLinks: oldSetting.socialMediaLinks || gym.socialMediaLinks || []
      };

      // Also ensure owner phone is mapped from owner mobile if phone is empty
      if (gym.owner && !gym.owner.phone) {
        updatedGymFields['owner.phone'] = gym.owner.mobile;
      }

      await platformConn.collection('gyms').updateOne(
        { _id: gym._id },
        { $set: updatedGymFields }
      );
      console.log(`  ✅ Merged operational fields to platform_db.gyms.`);

      // 2. Restructure settings collection in tenant database
      await tenantConn.collection('settings').deleteMany({});
      await tenantConn.collection('settings').insertOne({
        partialPayment: {
          enabled: true,
          minimumPercentage: 50
        },
        dueSettings: {
          defaultDaysFor1To6Months: 15,
          defaultDaysAbove6Months: 30,
          allowCustomDueDays: true,
          customPlanDueDays: {
            "1 Month": 15,
            "2 Months": 15,
            "3 Months": 15,
            "6 Months": 15,
            "12 Months": 30
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`  ✅ Restructured tenant Settings collection.`);
    } else {
      console.log(`  ℹ️ No settings document found in ${dbName} settings collection.`);
    }

    // 3. Ensure local unique indexes inside each gym database clients collection
    const clientsCollection = tenantConn.collection('clients');
    try {
      await clientsCollection.createIndex({ "personalInfo.email": 1 }, { unique: true });
      console.log(`  ✅ Ensured local unique index on personalInfo.email`);
    } catch (idxErr) {
      console.warn(`  ⚠️ Could not build unique index on email: ${idxErr.message}`);
    }

    try {
      await clientsCollection.createIndex({ "personalInfo.mobileNo": 1 }, { unique: true });
      console.log(`  ✅ Ensured local unique index on personalInfo.mobileNo`);
    } catch (idxErr) {
      console.warn(`  ⚠️ Could not build unique index on mobileNo: ${idxErr.message}`);
    }

    try {
      await clientsCollection.createIndex(
        { clientId: 1 },
        { unique: true, partialFilterExpression: { clientId: { $exists: true } } }
      );
      console.log(`  ✅ Ensured local unique index on clientId`);
    } catch (idxErr) {
      console.warn(`  ⚠️ Could not build unique index on clientId: ${idxErr.message}`);
    }

    await tenantConn.close();
  }

  await platformConn.close();
  console.log('\n🎉 Multi-tenant database restructuring & index checks completed successfully!');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
