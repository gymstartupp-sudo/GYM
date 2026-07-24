const sendEmail = require('../utils/sendEmail');
require('dotenv').config({ path: 'd:/GYM/server/.env' });

const run = async () => {
  try {
    console.log('Using email:', process.env.EMAIL_USER);
    console.log('Using pass length:', process.env.EMAIL_PASS?.length);
    await sendEmail({
      email: 'deepan.nr57@gmail.com',
      subject: 'Test Email from Gym Platform',
      message: 'This is a test message to debug forgot password flow email delivery.',
      html: '<h3>Test email</h3>'
    });
    console.log('Test email script finished.');
  } catch (err) {
    console.error('Test email script failed:', err);
  }
};

run();
