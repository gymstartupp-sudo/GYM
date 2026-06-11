const Client = require('../models/Client');
const Payment = require('../models/Payment');
const { getPlanStatus, getPaymentStatus, getClientPlans, normalizeDate } = require('./membership');

/**
 * Single authoritative sync point for a client's status.
 * 
 * This function:
 * 1. Recalculates `paymentStatus` from membership balances
 * 2. Sets `client.membership` (singular) to the current/next plan with correct status + daysLeft
 * 
 * This is the ONLY function that should write to `client.membership` and `client.paymentStatus`.
 * No other cron job or controller should directly modify these fields.
 */
const syncClientStatus = async (clientId) => {
  try {
    const client = await Client.findById(clientId);
    if (!client) return null;

    const today = new Date();
    const normalizedToday = normalizeDate(today);

    // ── 1. Calculate payment status based on membership balances ──
    let hasOverdue = false;
    let hasPartial = false;

    if (client.memberships && Array.isArray(client.memberships)) {
      for (const m of client.memberships) {
        const finalPrice = m.finalPrice || 0;
        const totalPaid = m.totalPaid || 0;
        const balance = finalPrice - totalPaid;

        if (balance > 0) {
          if (m.dueDate && new Date(m.dueDate) < today) {
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

    // ── 2. Synchronize `client.membership` (singular) from `memberships[]` ──
    const { currentPlan, nextPlan, previousPlans } = getClientPlans(client.memberships || [], today);
    const bestPlan = currentPlan || nextPlan || (previousPlans && previousPlans[0]);

    if (bestPlan) {
      // Compute daysLeft dynamically
      const endDate = normalizeDate(bestPlan.endDate);
      const diffTime = endDate.getTime() - normalizedToday.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Compute status dynamically
      let status = getPlanStatus(bestPlan, today);
      if (status === 'active' && daysLeft <= 3 && daysLeft >= 0) {
        status = 'expiring_soon';
      }

      client.membership = {
        planId: bestPlan.planId,
        planName: bestPlan.planName,
        planDurationMonths: bestPlan.planDurationMonths,
        durationMonths: bestPlan.planDurationMonths, // backward compat
        startDate: bestPlan.startDate,
        endDate: bestPlan.endDate,
        daysLeft: daysLeft,
        status: status,
        requestApproved: true,
        expiryReminderSent: client.membership?.expiryReminderSent || false,
        expiredReminderSent: client.membership?.expiredReminderSent || false
      };
    }

    if (client.membership && client.membership.status) {
      client.membership.status = client.membership.status.toLowerCase();
    }

    await client.save();
    return client;
  } catch (error) {
    console.error('Error syncing client status:', error);
    return null;
  }
};

module.exports = { syncClientStatus };
