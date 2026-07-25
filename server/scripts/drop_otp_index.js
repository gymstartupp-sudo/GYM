require('dotenv').config();
const mongoose = require('mongoose');

const dropOtpIndex = async () => {
  try {
    console.log('Connecting to database...');
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
    console.log('Database connected.');

    const collection = mongoose.connection.db.collection('passwordresetotps');
    const indexes = await collection.indexes();
    console.log('Existing indexes:', indexes.map(idx => idx.name));

    // Look for index with name matching 'createdAt_1' or any index with { createdAt: 1 }
    const indexName = 'createdAt_1';
    if (indexes.some(idx => idx.name === indexName)) {
      console.log(`Dropping index "${indexName}"...`);
      await collection.dropIndex(indexName);
      console.log(`Successfully dropped "${indexName}".`);
    }

    console.log('Triggering PasswordResetOTP to build updated indexes...');
    const PasswordResetOTP = require('../models/PasswordResetOTP');
    await PasswordResetOTP.createIndexes();
    console.log('Index rebuilt with new TTL.');

    const finalIndexes = await collection.indexes();
    console.log('Final indexes:', JSON.stringify(finalIndexes, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

dropOtpIndex();
