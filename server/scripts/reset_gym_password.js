const mongoose = require('mongoose');
const readline = require('readline');
require('dotenv').config();

const Gym = require('../models/Gym');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

const isEmail = (value) => value.includes('@');
const isPhone = (value) => /^[0-9]{10}$/.test(value);

async function main() {
  try {
    const identifierArg = process.argv.find((arg) => arg.startsWith('--gym='))?.split('=')[1];
    const passwordArg = process.argv.find((arg) => arg.startsWith('--password='))?.split('=')[1];
    const confirmArg = process.argv.find((arg) => arg.startsWith('--confirm='))?.split('=')[1];

    const gymIdentifier = identifierArg || (await ask('Gym email, phone, or gym ID: ')).trim();
    const newPassword = passwordArg || (await ask('New password: ')).trim();
    const confirmPassword = confirmArg || (await ask('Confirm new password: ')).trim();

    if (!gymIdentifier) {
      throw new Error('Gym identifier is required.');
    }

    if (!newPassword) {
      throw new Error('New password is required.');
    }

    if (newPassword !== confirmPassword) {
      throw new Error('Password confirmation does not match.');
    }

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
    await mongoose.connect(uri);

    const query = isEmail(gymIdentifier)
      ? { gymEmail: gymIdentifier }
      : isPhone(gymIdentifier)
        ? { gymContact: gymIdentifier }
        : { gymId: gymIdentifier };

    const gym = await Gym.findOne(query);

    if (!gym) {
      throw new Error('No gym account matched the provided identifier.');
    }

    gym.password = newPassword;
    await gym.save();

    console.log(`Password updated successfully for ${gym.gymName} (${gym.gymId}).`);
  } catch (error) {
    console.error(`Password reset failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    rl.close();
    await mongoose.disconnect().catch(() => {});
  }
}

main();