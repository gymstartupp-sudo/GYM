require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('../models/Client');

const cleanIndexes = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Database connected.');

    const collection = mongoose.connection.db.collection('clients');
    const indexes = await collection.indexes();
    console.log('Existing indexes:', indexes.map(idx => idx.name));

    // Drop legacy clientId_1 index if it exists
    if (indexes.some(idx => idx.name === 'clientId_1')) {
      console.log('Dropping legacy single-field index "clientId_1"...');
      await collection.dropIndex('clientId_1');
      console.log('Successfully dropped "clientId_1".');
    }

    // Drop legacy gymId_1_clientId_1 index if it exists
    if (indexes.some(idx => idx.name === 'gymId_1_clientId_1')) {
      console.log('Dropping legacy compound index "gymId_1_clientId_1"...');
      await collection.dropIndex('gymId_1_clientId_1');
      console.log('Successfully dropped "gymId_1_clientId_1".');
    }

    console.log('Triggering Mongoose to build updated indexes...');
    await Client.createIndexes();
    console.log('Indexes built successfully.');

    // List final indexes
    const finalIndexes = await collection.indexes();
    console.log('Final indexes:', JSON.stringify(finalIndexes, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

cleanIndexes();
