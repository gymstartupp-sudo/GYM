const mongoose = require('mongoose');
require('dotenv').config();

const dropIndex = async () => {
  try {
    console.log('Connecting to database...');
    const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!dbUri) {
      throw new Error('Database connection URI not found in environment variables (.env)');
    }
    
    await mongoose.connect(dbUri);
    console.log('Database connected successfully!');
    
    const Feedback = require('./models/Feedback');
    
    console.log('Dropping unique index "feedbackId_1" from feedbacks collection...');
    await Feedback.collection.dropIndex('feedbackId_1');
    console.log('Successfully dropped legacy index "feedbackId_1"!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to drop index:', err.message);
    process.exit(1);
  }
};

dropIndex();
