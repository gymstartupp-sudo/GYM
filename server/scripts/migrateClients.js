/**
 * Migration Script: Convert Client IDs to SaaS Multi-Tenant Format
 *
 * Before: Each gym had a custom prefix (LIK, FIT, ABC), so client IDs were like LIK-01, FIT-02.
 * After:  All gyms use CL-01, CL-02, ... and uniqueness is enforced by (gymId + clientId) compound index.
 *
 * What this script does:
 *   1. Connects to MongoDB.
 *   2. For each gym, fetches all its clients sorted by creation date (oldest first).
 *   3. Reassigns client IDs sequentially as CL-01, CL-02, etc.
 *   4. Updates the Counter collection so future registrations continue from the correct number.
 *   5. Drops any legacy single-field unique index on clientId (if it exists).
 *
 * Run with: node server/scripts/migrateClients.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI (or MONGO_URI) is not set in your .env file.');
  process.exit(1);
}

// ─── Inline minimal schemas (avoids bcrypt pre-save hooks firing) ────────────
const counterSchema = new mongoose.Schema({ name: String, value: { type: Number, default: 0 } });
const Counter = mongoose.model('Counter', counterSchema);

const gymSchema = new mongoose.Schema({ gymId: String, gymName: String });
const Gym = mongoose.model('Gym', gymSchema);

const clientSchema = new mongoose.Schema(
  { clientId: String, gymId: String },
  { strict: false }
);
const Client = mongoose.model('Client', clientSchema);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');

async function dropLegacyIndex() {
  try {
    const collection = mongoose.connection.collection('clients');
    const indexes = await collection.indexes();
    const legacyIndex = indexes.find(
      (idx) => idx.key && idx.key.clientId === 1 && !idx.key.gymId
    );
    if (legacyIndex) {
      await collection.dropIndex(legacyIndex.name);
      console.log(`  ✅ Dropped legacy unique index: ${legacyIndex.name}`);
    } else {
      console.log('  ℹ️  No legacy single-field clientId index found — skipping drop.');
    }
  } catch (err) {
    console.warn('  ⚠️  Could not check/drop index:', err.message);
  }
}

async function migrateGym(gym) {
  const clients = await Client.find({ gymId: gym.gymId })
    .sort({ createdAt: 1 })
    .select('_id clientId gymId')
    .lean();

  if (clients.length === 0) {
    console.log(`  Gym ${gym.gymId} (${gym.gymName}): no clients — skipped.`);
    return 0;
  }

  let migratedCount = 0;
  for (let i = 0; i < clients.length; i++) {
    const newClientId = `CL-${pad(i + 1)}`;
    const oldClientId = clients[i].clientId || '(none)';

    await Client.updateOne(
      { _id: clients[i]._id },
      { $set: { clientId: newClientId } }
    );

    if (oldClientId !== newClientId) {
      console.log(`    ${oldClientId} → ${newClientId}`);
      migratedCount++;
    }
  }

  // Update Counter so the next new client for this gym gets the right number
  const counterName = `clientId:${gym.gymId}`;
  await Counter.findOneAndUpdate(
    { name: counterName },
    { $set: { value: clients.length } },
    { upsert: true }
  );

  console.log(
    `  Gym ${gym.gymId} (${gym.gymName}): ${clients.length} clients processed, ${migratedCount} IDs changed. Counter → ${clients.length}.`
  );

  return migratedCount;
}

async function run() {
  console.log('🚀  Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅  Connected.\n');

  // Step 1: Drop legacy index
  console.log('Step 1: Checking for legacy clientId unique index...');
  await dropLegacyIndex();
  console.log('');

  // Step 2: Migrate each gym
  console.log('Step 2: Migrating client IDs per gym...\n');
  const gyms = await Gym.find().select('gymId gymName').lean();

  if (gyms.length === 0) {
    console.log('  No gyms found. Nothing to migrate.');
  }

  let totalChanged = 0;
  for (const gym of gyms) {
    totalChanged += await migrateGym(gym);
  }

  console.log(`\n✅  Migration complete. Total IDs changed: ${totalChanged}`);
  await mongoose.disconnect();
  console.log('🔌  Disconnected from MongoDB.');
}

run().catch((err) => {
  console.error('❌  Migration failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
