const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Gym = require('../models/Gym');
const { getTenantConnection } = require('../utils/connectionManager');
const { runWithTenantContext } = require('../utils/tenantContext');

const calculateBalances = (clientDoc, preFetchedPayments = []) => {
  const client = clientDoc.toObject ? clientDoc.toObject() : clientDoc;
  
  // Filter payments for this specific client
  const clientPayments = preFetchedPayments.filter(p => p.clientId?.toString() === client._id.toString());

  // Attach full payment objects to paymentHistory, sorted by newest first
  client.paymentHistory = clientPayments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (client.memberships && Array.isArray(client.memberships)) {
    client.memberships = client.memberships.map(m => {
      // Find all payments belonging to this membership period
      const relatedPayments = clientPayments.filter(p => {
        const mPlanId = m.planId ? m.planId.toString() : null;
        const pPlanId = p.planId ? p.planId.toString() : null;
        if (mPlanId !== pPlanId) return false;

        if (p.startDate && m.startDate) {
          return new Date(p.startDate).setHours(0, 0, 0, 0) === new Date(m.startDate).setHours(0, 0, 0, 0);
        }
        return !p.startDate && !m.startDate;
      });

      const totalPaid = relatedPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
      const finalPrice = m.finalPrice || (relatedPayments.length > 0 ? relatedPayments[0].amount : 0);
      const balance = finalPrice - totalPaid;

      const latestPaymentWithDueDate = [...relatedPayments]
        .filter(p => p.dueDate)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      return {
        ...m,
        finalPrice,
        totalPaid,
        balance: Math.max(0, balance),
        dueDate: latestPaymentWithDueDate ? latestPaymentWithDueDate.dueDate : m.dueDate
      };
    });
    
    // Sort memberships: newest first
    client.memberships.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  }
  
  return client;
};

const test = async () => {
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

    const gym = await Gym.findOne({ dbName: 'gym_NEX_29' });
    const conn = await getTenantConnection(gym.dbName);
    const ClientModel = conn.models.Client || conn.model('Client', require('../models/Client').schema);
    const PaymentModel = conn.models.Payment || conn.model('Payment', require('../models/Payment').schema);

    const client = await ClientModel.findOne({ 'personalInfo.name': 'Deepan' }).populate('membership.planId').lean();
    
    await runWithTenantContext({ tenantDb: conn, models: { Client: ClientModel, Payment: PaymentModel } }, async () => {
      const payments = await PaymentModel.find({ clientId: client._id.toString() }).lean();
      const enriched = calculateBalances(client, payments);
      console.log('Enriched client paymentHistory count:', enriched.paymentHistory.length);
      console.log('paymentHistory details:', enriched.paymentHistory);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

test();
