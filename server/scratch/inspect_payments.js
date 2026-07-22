const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const { getTenantConnection } = require('../utils/connectionManager');

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
    console.log('Connected to DB.');
  } catch (err) {
    console.error('Connection failed:', err);
    return;
  }

  const Gym = require('../models/Gym');
  const gyms = await Gym.find({}).lean();
  
  for (const gym of gyms) {
    console.log(`\n=== Gym: ${gym.gymName} (${gym.gymId}) ===`);
    const conn = await getTenantConnection(gym.dbName);
    
    let Payment;
    try {
      Payment = conn.model('Payment');
    } catch (e) {
      Payment = conn.model('Payment', require('../models/Payment').schema);
    }
    
    let Client;
    try {
      Client = conn.model('Client');
    } catch (e) {
      Client = conn.model('Client', require('../models/Client').schema);
    }

    const latestPayments = await Payment.find({}).sort({ createdAt: -1 }).limit(10).lean();
    console.log(`Latest 10 Payments:`);
    for (const p of latestPayments) {
      const client = await Client.findById(p.clientId).lean();
      const clientName = client ? client.personalInfo.name : 'Unknown';
      console.log(`- ID: ${p.paymentId || p._id}, Client: ${clientName}, Amount: ${p.paidNow || p.paidAmount || 0}, Method: ${p.paymentMethod}, billSentViaWhatsApp: ${p.billSentViaWhatsApp}, Date: ${p.createdAt}`);
    }
  }

  await mongoose.disconnect();
}

main();
