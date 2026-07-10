require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function run() {
  let uri = process.env.MONGODB_URI;
  if (!uri.includes('/platform_db')) {
    if (uri.includes('?')) {
      uri = uri.replace(/\/[^/?]*\?/, '/platform_db?');
    } else {
      uri = uri.endsWith('/') ? uri + 'platform_db' : uri + '/platform_db';
    }
  }

  await mongoose.connect(uri);
  const GymModel = mongoose.models.Gym || mongoose.model('Gym', require('../models/Gym').schema);
  const { getTenantConnection } = require('../utils/connectionManager');

  const gym = await GymModel.findOne({ gymId: 'NEX-30' }); // VitalFit 1
  const tenantConn = await getTenantConnection(gym.dbName);

  const ClientModel = tenantConn.models.Client || tenantConn.model('Client', require('../models/Client').schema);
  const PaymentModel = tenantConn.models.Payment || tenantConn.model('Payment', require('../models/Payment').schema);

  const client = await ClientModel.findOne({ clientId: 'CL-63' }).lean();
  console.log('CLIENT:', JSON.stringify(client, null, 2));

  const payments = await PaymentModel.find({ clientId: client._id.toString() }).lean();
  console.log('PAYMENTS:', JSON.stringify(payments, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
