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
    
    const UserSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', UserSchema);
    
    const users = await User.find({ role: 'owner' }).lean();
    console.log('--- Gym Owners ---');
    users.forEach(u => {
      console.log(`Email: ${u.email}, GymID: ${u.gymId}, Role: ${u.role}, Name: ${u.name}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
main();
