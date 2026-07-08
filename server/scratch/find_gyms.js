const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

async function main() {
  let uri = process.env.MONGODB_URI;
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
  
  try {
    await mongoose.connect(uri);
    console.log('Connected to DB');
    
    const Gym = require('../models/Gym');
    const gyms = await Gym.find({}).lean();
    console.log('--- Gyms ---');
    gyms.forEach(g => {
      console.log(`GymName: ${g.gymName}, GymID: ${g.gymId}, Email: ${g.gymEmail}, Contact: ${g.gymContact}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
main();
