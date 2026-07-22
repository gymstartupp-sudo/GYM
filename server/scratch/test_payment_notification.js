const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const { getTenantConnection } = require('../utils/connectionManager');
const { sendPaymentNotification } = require('../services/whatsappNotificationService');

async function main() {
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
  console.log('Connected to DB.');

  const Gym = require('../models/Gym');
  const gym = await Gym.findOne({ gymId: 'NEX-29' }).lean();
  
  if (!gym) {
    console.error('Gym NEX-29 not found.');
    return;
  }

  const conn = await getTenantConnection(gym.dbName);
  
  let Payment;
  try {
    Payment = conn.model('Payment');
  } catch (e) {
    Payment = conn.model('Payment', require('../models/Payment').schema);
  }

  const payment = await Payment.findOne({ paymentId: 'REX-006' });
  if (!payment) {
    console.error('Payment REX-006 not found.');
    return;
  }

  console.log('Triggering sendPaymentNotification...');
  await sendPaymentNotification(payment._id, payment.clientId, gym.gymId, gym.dbName);
  console.log('Finished.');
  await mongoose.disconnect();
}

main();
