const mongoose = require('mongoose');
require('dotenv').config();
const Client = require('../models/Client');
const Payment = require('../models/Payment');
const { syncClientStatus } = require('../utils/syncStatus');

async function runCleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Successfully connected to MongoDB');

    const clients = await Client.find({});
    console.log(`Scanning ${clients.length} clients for duplicates...`);

    let totalDuplicateMembershipsRemoved = 0;
    let totalDuplicatePaymentsRemoved = 0;

    for (const client of clients) {
      if (!client.memberships || client.memberships.length === 0) continue;

      const uniqueMemberships = [];
      const duplicateIds = [];
      const membershipKeys = new Map();

      // 1. Scan memberships for duplicate entries (same planId/planName and startDate)
      client.memberships.forEach(m => {
        const planKey = m.planId ? m.planId.toString() : (m.planName || 'custom');
        const startKey = m.startDate ? new Date(m.startDate).toISOString().split('T')[0] : '';
        const key = `${planKey}_${startKey}`;

        if (membershipKeys.has(key)) {
          duplicateIds.push(m._id.toString());
        } else {
          membershipKeys.set(key, m);
          uniqueMemberships.push(m);
        }
      });

      if (duplicateIds.length > 0) {
        console.log(`Client: ${client.personalInfo?.name} (${client.clientId || client._id}) has ${duplicateIds.length} duplicate memberships.`);
        
        // 2. Resolve associated payment documents
        for (const [key, keptMembership] of membershipKeys.entries()) {
          const planId = keptMembership.planId;
          const startDate = keptMembership.startDate;

          const query = {
            clientId: client._id,
            startDate: {
              $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
              $lte: new Date(new Date(startDate).setHours(23, 59, 59, 999))
            }
          };
          if (planId) query.planId = planId;

          const relatedPayments = await Payment.find(query);
          if (relatedPayments.length > 1) {
            console.log(`  Found ${relatedPayments.length} related payment records for plan: ${keptMembership.planName} starting ${new Date(startDate).toLocaleDateString('en-GB')}`);
            
            // Sort payments: keep the one with the highest paidAmount, delete the rest
            relatedPayments.sort((a, b) => (b.paidAmount || 0) - (a.paidAmount || 0));
            
            const keptPayment = relatedPayments[0];
            const paymentIdsToDelete = relatedPayments.slice(1).map(p => p._id.toString());
            
            if (paymentIdsToDelete.length > 0) {
              console.log(`  Keeping payment ${keptPayment.paymentId} (paid: ₹${keptPayment.paidAmount})`);
              console.log(`  Deleting duplicate payments: ${paymentIdsToDelete.join(', ')}`);
              
              const delRes = await Payment.deleteMany({ _id: { $in: paymentIdsToDelete } });
              totalDuplicatePaymentsRemoved += delRes.deletedCount;

              // Filter out the deleted payment IDs from client's paymentHistory
              client.paymentHistory = client.paymentHistory.filter(pid => 
                !paymentIdsToDelete.includes(pid.toString())
              );
            }
          }
        }

        // 3. Update memberships array and save client
        const oldLength = client.memberships.length;
        client.memberships = uniqueMemberships;
        totalDuplicateMembershipsRemoved += (oldLength - uniqueMemberships.length);

        await client.save();
        console.log(`  Saved client with unique memberships. Recalculating status...`);
        
        // 4. Run synchronization to restore correct singular status fields
        await syncClientStatus(client._id);
      }
    }

    console.log('--- CLEANUP COMPLETED ---');
    console.log(`Removed ${totalDuplicateMembershipsRemoved} duplicate membership entries.`);
    console.log(`Deleted ${totalDuplicatePaymentsRemoved} duplicate payment documents.`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error running cleanup:', error);
    process.exit(1);
  }
}

runCleanup();
