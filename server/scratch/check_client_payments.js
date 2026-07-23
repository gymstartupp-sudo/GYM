const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Gym = require('../models/Gym');
const { getTenantConnection } = require('../utils/connectionManager');

const check = async () => {
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
    console.log('Connected to DB.');

    const gym = await Gym.findOne({ dbName: 'gym_NEX_29' });
    const conn = await getTenantConnection(gym.dbName);
    const PaymentModel = conn.models.Payment || conn.model('Payment', require('../models/Payment').schema);
    const ClientModel = conn.models.Client || conn.model('Client', require('../models/Client').schema);

    // Let's find client Deepan
    const client = await ClientModel.findOne({ 'personalInfo.name': 'Deepan' });
    if (!client) {
      console.log('Client Deepan not found');
      process.exit(1);
    }

    console.log(`Found client: _id=${client._id}, clientId=${client.clientId}`);
    
    // Find all payments for this clientId
    const payments = await PaymentModel.find({ clientId: client._id.toString() }).lean();
    console.log(`Payments count: ${payments.length}`);
    for (const p of payments) {
      console.log(`Payment: ID=${p.paymentId}, amount=${p.amount}, paidNow=${p.paidNow}, status=${p.status}`);
    }

    // Wait! Let's check ALL payments in the collection to see if any exist and what they look like
    const allPayments = await PaymentModel.find().lean();
    console.log(`All payments count in collection: ${allPayments.length}`);
    for (const p of allPayments) {
      console.log(`Payment Record: ID=${p.paymentId}, clientId=${p.clientId}, clientName=${p.clientName}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

check();
