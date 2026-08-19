const cron = require('node-cron');
const Client = require('../models/Client');
const Payment = require('../models/Payment');
const Gym = require('../models/Gym');
const { syncClientStatus } = require('../utils/syncStatus');
const { getTenantConnection } = require('../utils/connectionManager');
const { runWithTenantContext } = require('../utils/tenantContext');

const runOverdueCheck = async () => {
  console.log('Running runOverdueCheck manually or via schedule...');
  const startTime = Date.now();
  let clientsChecked = 0;
  let clientsMarkedOverdue = 0;
  let clientsSkipped = 0;

  try {
    const gyms = await Gym.find({ isActive: true });

    for (const gym of gyms) {
      try {
        const conn = await getTenantConnection(gym.dbName);
        const models = {
          Client: conn.model('Client'),
          Plan: conn.model('Plan'),
          Payment: conn.model('Payment'),
          Expense: conn.model('Expense'),
          Feedback: conn.model('Feedback'),
          Counter: conn.model('Counter'),
          Setting: conn.model('Setting')
        };

        await runWithTenantContext({ tenantDb: conn, models }, async () => {
          // 1. Transition past due payments to overdue
          const pendingPayments = await Payment.find({
            status: { $in: ['pending', 'partial'] },
            dueDate: { $lt: new Date() }
          });

          for (let payment of pendingPayments) {
            // Only transition if this is the latest transaction for this membership window
            const newerPayment = await Payment.findOne({
              clientId: payment.clientId,
              planId: payment.planId,
              startDate: payment.startDate,
              createdAt: { $gt: payment.createdAt }
            });

            if (newerPayment) {
              continue;
            }

            payment.status = 'overdue';
            await payment.save();
          }

          // 2. Sync client payment statuses
          const clients = await Client.find({ isActive: true, isDeleted: { $ne: true }, 'membership.requestApproved': true });
          clientsChecked += clients.length;

          for (let client of clients) {
            const oldStatus = client.paymentStatus;
            await syncClientStatus(client._id);

            // Fetch the updated status to see if it transitioned to overdue
            const updatedClient = await Client.findById(client._id);
            if (updatedClient && updatedClient.paymentStatus === 'overdue' && oldStatus !== 'overdue') {
              clientsMarkedOverdue++;
            } else {
              clientsSkipped++;
            }
          }
        });
      } catch (gymErr) {
        console.error(`Error in runOverdueCheck for gym ${gym.gymId} (${gym.dbName}):`, gymErr);
      }
    }

    const duration = Date.now() - startTime;
    console.log('runOverdueCheck completed successfully.');
    return {
      clientsChecked,
      clientsMarkedOverdue,
      clientsSkipped,
      executionTime: `${duration}ms`
    };
  } catch (err) {
    console.error('Error in runOverdueCheck:', err);
    throw err;
  }
};

// Run every day at 00:05
cron.schedule('35 14 * * *', async () => {
  console.log('Running statusUpdater job...');
  try {
    await runOverdueCheck();
    console.log('statusUpdater job completed.');
  } catch (err) {
    console.error('Error in statusUpdater job:', err);
  }
});

module.exports = { runOverdueCheck };

