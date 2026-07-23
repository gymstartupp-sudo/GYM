const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Gym = require('../models/Gym');
const { getTenantConnection } = require('../utils/connectionManager');

const checkPayment = async () => {
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

    const gym = await Gym.findOne({ dbName: 'gym_NEX_29' });
    const conn = await getTenantConnection(gym.dbName);
    const PaymentModel = conn.models.Payment || conn.model('Payment', require('../models/Payment').schema);

    const payment = await PaymentModel.findById('6a61c2b5cee7c946e0c9b445');
    console.log('Payment:', JSON.stringify(payment, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

checkPayment();
