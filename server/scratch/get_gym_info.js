const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Gym = require('../models/Gym');

const checkGym = async () => {
  try {
    let uri = process.env.MONGODB_URI;
    if (uri && !uri.includes('/platform_db')) {
      const url = require('url');
      try {
        const parsed = new url.URL(uri);
        parsed.pathname = '/platform_db';
        uri = parsed.toString();
      } catch (e) {
        uri = uri.replace(/\/[^/?]*\?/, '/platform_db?');
      }
    }
    await mongoose.connect(uri);
    console.log('Connected to platform DB.');

    const gym = await Gym.findOne({ gymId: 'NEX-29' });
    console.log('Gym:', JSON.stringify(gym, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

checkGym();
