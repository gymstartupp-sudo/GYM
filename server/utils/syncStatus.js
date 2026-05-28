const Client = require('../models/Client');
const Payment = require('../models/Payment');
const { buildMembershipWindow } = require('./membership');

const syncClientStatus = async (clientId) => {
  try {
    const client = await Client.findById(clientId);
    if (!client) return null;

    // Calculate payment status based on membership balances instead of immutable payment snapshots
    let hasOverdue = false;
    let hasPartial = false;

    if (client.memberships && Array.isArray(client.memberships)) {
      for (const m of client.memberships) {
        const finalPrice = m.finalPrice || 0;
        const totalPaid = m.totalPaid || 0;
        const balance = finalPrice - totalPaid;

        if (balance > 0) {
          if (m.dueDate && new Date(m.dueDate) < new Date()) {
            hasOverdue = true;
          } else {
            hasPartial = true;
          }
        }
      }
    }

    if (hasOverdue) {
      client.paymentStatus = 'overdue';
    } else if (hasPartial) {
      client.paymentStatus = 'partial';
    } else {
      client.paymentStatus = 'paid';
    }

    // 2. Synchronize Membership (Automatic Continuation)
    // Find the currently active plan, or the next upcoming one if no active exists
    const { currentPlan, nextPlan } = require('./membership').getClientPlans(client.memberships || []);
    
    if (currentPlan) {
      client.membership = {
        ...currentPlan,
        requestApproved: true
      };
    } else if (nextPlan && (!client.membership || new Date(client.membership.endDate) < new Date())) {
      // If no active plan, but we have an upcoming one, and the previous one is expired
      // Note: We don't necessarily make it 'Active' here, the getPlanStatus will handle it dynamically.
      // But we update the primary field to point to the next relevant plan.
      client.membership = {
        ...nextPlan,
        requestApproved: true
      };
    }

    await client.save();
    return client;
  } catch (error) {
    console.error('Error syncing client status:', error);
    return null;
  }
};

module.exports = { syncClientStatus };
