const Gym = require('../models/Gym');
const Client = require('../models/Client');
const Payment = require('../models/Payment');
const Plan = require('../models/Plan');
const Expense = require('../models/Expense');
const Feedback = require('../models/Feedback');
const Counter = require('../models/Counter');

// @desc    Get Admin Dashboard Stats
// @route   GET /api/admin/dashboard
// @access  Private (SuperAdmin)
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalGyms = await Gym.countDocuments();
    const gyms = await Gym.find({ isActive: true });
    let totalClients = 0;
    let totalPayments = 0;
    const { getTenantConnection } = require('../utils/connectionManager');

    for (const gym of gyms) {
      try {
        const conn = await getTenantConnection(gym.dbName);
        const TenantClient = conn.model('Client');
        const TenantPayment = conn.model('Payment');
        totalClients += await TenantClient.countDocuments({ isActive: true });
        totalPayments += await TenantPayment.countDocuments();
      } catch (err) {
        console.error(`Error counting stats in tenant ${gym.dbName}:`, err);
      }
    }

    res.status(200).json({
      success: true,
      data: { totalGyms, totalClients, totalPayments }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get All Gyms
// @route   GET /api/admin/gyms
// @access  Private (SuperAdmin)
exports.getAllGyms = async (req, res, next) => {
  try {
    const gyms = await Gym.find().select('-password').lean();

    const data = gyms.map(gym => ({
      ...gym,
      ownerName: gym.owner?.name || 'N/A'
    }));

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Single Gym Profile (for admin view)
// @route   GET /api/admin/gym/:id/profile
// @access  Private (SuperAdmin)
exports.getGymProfile = async (req, res, next) => {
  try {
    const gym = await Gym.findById(req.params.id).select('-password').lean();
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    const owner = gym.owner ? {
      name: gym.owner.name,
      mobileNo: gym.owner.mobile,
      mailId: gym.owner.email
    } : null;

    const { getTenantConnection } = require('../utils/connectionManager');
    const conn = await getTenantConnection(gym.dbName);
    const TenantClient = conn.model('Client');
    const TenantPlan = conn.model('Plan');
    const TenantPayment = conn.model('Payment');

    const [totalClients, activeClients, totalPlans, totalPayments] = await Promise.all([
      TenantClient.countDocuments({}),
      TenantClient.countDocuments({ isActive: true }),
      TenantPlan.countDocuments({}),
      TenantPayment.countDocuments({})
    ]);

    res.status(200).json({
      success: true,
      data: {
        gym,
        owner: owner || null,
        stats: { totalClients, activeClients, totalPlans, totalPayments }
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle Gym Status (activate/deactivate)
// @route   PUT /api/admin/gym/:id/status
// @access  Private (SuperAdmin)
exports.toggleGymStatus = async (req, res, next) => {
  try {
    const gym = await Gym.findById(req.params.id);
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    gym.isActive = !gym.isActive;
    await gym.save();

    res.status(200).json({ success: true, data: gym });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete Gym and all associated data permanently
// @route   DELETE /api/admin/gym/:id
// @access  Private (SuperAdmin)
exports.deleteGym = async (req, res, next) => {
  try {
    const gym = await Gym.findById(req.params.id).select('_id gymId gymName dbName').lean();
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    // Cascade drop the tenant database
    const { getTenantConnection } = require('../utils/connectionManager');
    try {
      const conn = await getTenantConnection(gym.dbName);
      await conn.db.dropDatabase();
      console.log(`Database ${gym.dbName} dropped successfully`);
    } catch (dbErr) {
      console.error(`Failed to drop database ${gym.dbName}:`, dbErr);
    }

    // Finally delete the gym platform metadata document
    await Gym.deleteOne({ _id: gym._id });

    res.status(200).json({
      success: true,
      message: `Gym "${gym.gymName}" and its isolated database deleted permanently`
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Trigger Overdue Check manually (Read-only Diagnostic Analytics)
// @route   POST /api/admin/overdue-check
// @access  Private (SuperAdmin)
exports.triggerOverdueCheck = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { getPlanStatus, getClientPlans } = require('../utils/membership');
    const { getTenantConnection } = require('../utils/connectionManager');

    const gyms = await Gym.find({ isActive: true });
    const gymStats = [];

    const overall = {
      totalGyms: 0,
      totalClients: 0,
      activeMembership: 0,
      expiringSoon: 0,
      membershipExpired: 0,
      pendingDues: 0,
      reminder1Eligible: 0,
      reminder2Eligible: 0,
      reminder3Eligible: 0,
      expiringSoonPending: 0,
      expiredPending: 0,
      fullyPaid: 0,
      renewedMemberships: 0,
      inactiveClients: 0
    };

    const calculateBalances = (client, clientPayments = []) => {
      if (client.memberships && Array.isArray(client.memberships)) {
        client.memberships = client.memberships.map(m => {
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
      }
      return client;
    };

    const today = new Date();
    const normalizedToday = new Date(today.setHours(0, 0, 0, 0));

    for (const gym of gyms) {
      try {
        const conn = await getTenantConnection(gym.dbName);
        const TenantClient = conn.model('Client');
        const TenantPayment = conn.model('Payment');

        const rawClients = await TenantClient.find({ isDeleted: { $ne: true } }).lean();
        const allPayments = await TenantPayment.find({}).lean();

        const paymentsMap = new Map();
        allPayments.forEach(p => {
          const cId = p.clientId?.toString();
          if (cId) {
            if (!paymentsMap.has(cId)) {
              paymentsMap.set(cId, []);
            }
            paymentsMap.get(cId).push(p);
          }
        });

        const stats = {
          gymId: gym.gymId,
          gymName: gym.gymName,
          totalClients: 0,
          activeMembership: 0,
          expiringSoon: 0,
          membershipExpired: 0,
          pendingDues: 0,
          reminder1Eligible: 0,
          reminder2Eligible: 0,
          reminder3Eligible: 0,
          expiringSoonPending: 0,
          expiredPending: 0,
          fullyPaid: 0,
          renewedMemberships: 0,
          inactiveClients: 0
        };

        for (const rawClient of rawClients) {
          const client = calculateBalances(rawClient, paymentsMap.get(rawClient._id.toString()) || []);

          if (client.isActive !== true) {
            stats.inactiveClients++;
            stats.totalClients++;
            continue;
          }

          stats.totalClients++;

          // 1. Calculate membership status and daysLeft in-memory
          const { currentPlan, nextPlan, previousPlans } = getClientPlans(client.memberships || [], today);
          const bestPlan = currentPlan || nextPlan || (previousPlans && previousPlans[0]);
          
          let daysLeft = null;
          let isMembershipActive = false;

          if (bestPlan) {
            const endDate = new Date(bestPlan.endDate);
            endDate.setHours(0, 0, 0, 0);
            const diffTime = endDate.getTime() - normalizedToday.getTime();
            daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const mStatus = getPlanStatus(bestPlan, today);
            isMembershipActive = (mStatus === 'active');
          }

          if (isMembershipActive) {
            stats.activeMembership++;
          }

          // 2. Calculate balance / pending dues in-memory
          let pendingAmount = 0;
          let outstandingMembership = null;
          if (client.memberships && Array.isArray(client.memberships)) {
            const sortedMems = [...client.memberships].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
            outstandingMembership = sortedMems.find(m => (m.finalPrice - m.totalPaid) > 0);
            pendingAmount = sortedMems.reduce((sum, m) => sum + Math.max(0, m.finalPrice - m.totalPaid), 0);
          }

          if (pendingAmount === 0) {
            stats.fullyPaid++;
          } else {
            stats.pendingDues++;
          }

          // 3. Reminder eligibility conditions
          if (daysLeft === 3 && pendingAmount === 0) {
            stats.expiringSoon++;
          }
          if (daysLeft === -1 && pendingAmount === 0) {
            stats.membershipExpired++;
          }
          if (daysLeft === 3 && pendingAmount > 0) {
            stats.expiringSoonPending++;
          }
          if (daysLeft === -1 && pendingAmount > 0) {
            stats.expiredPending++;
          }

          // Overdue Reminders
          if (outstandingMembership && outstandingMembership.dueDate) {
            const normDueDate = new Date(outstandingMembership.dueDate);
            normDueDate.setHours(0, 0, 0, 0);
            const diffTime = normDueDate.getTime() - normalizedToday.getTime();
            const daysUntilDue = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (daysUntilDue === 3) {
              stats.reminder1Eligible++;
            } else if (daysUntilDue === 0) {
              stats.reminder2Eligible++;
            } else if (daysUntilDue === -3) {
              stats.reminder3Eligible++;
            }
          }

          // Renewed membership
          if (client.memberships && client.memberships.length > 1) {
            stats.renewedMemberships++;
          }
        }

        gymStats.push(stats);

        // Update overall stats
        overall.totalClients += stats.totalClients;
        overall.activeMembership += stats.activeMembership;
        overall.expiringSoon += stats.expiringSoon;
        overall.membershipExpired += stats.membershipExpired;
        overall.pendingDues += stats.pendingDues;
        overall.reminder1Eligible += stats.reminder1Eligible;
        overall.reminder2Eligible += stats.reminder2Eligible;
        overall.reminder3Eligible += stats.reminder3Eligible;
        overall.expiringSoonPending += stats.expiringSoonPending;
        overall.expiredPending += stats.expiredPending;
        overall.fullyPaid += stats.fullyPaid;
        overall.renewedMemberships += stats.renewedMemberships;
        overall.inactiveClients += stats.inactiveClients;

      } catch (gymErr) {
        console.error(`Error calculating statistics for gym ${gym.gymId}:`, gymErr);
      }
    }

    overall.totalGyms = gymStats.length;
    const finalDuration = Date.now() - startTime;

    // Build plain text report
    let textReport = `Execution Statistics\n\nExecution Time:\n${finalDuration} ms\n\nGyms Processed:\n${gymStats.length}\n\n==================================================\n\n`;

    for (const stats of gymStats) {
      textReport += `Gym: ${stats.gymId} (${stats.gymName})\n\n`;
      textReport += `Total Clients: ${stats.totalClients}\n\n`;
      textReport += `Active Membership: ${stats.activeMembership}\n\n`;
      textReport += `Expiring Soon: ${stats.expiringSoon}\n\n`;
      textReport += `Membership Expired: ${stats.membershipExpired}\n\n`;
      textReport += `Pending Dues: ${stats.pendingDues}\n\n`;
      textReport += `Reminder 1 Eligible: ${stats.reminder1Eligible}\n\n`;
      textReport += `Reminder 2 Eligible: ${stats.reminder2Eligible}\n\n`;
      textReport += `Reminder 3 Eligible: ${stats.reminder3Eligible}\n\n`;
      textReport += `Expiring Soon + Pending: ${stats.expiringSoonPending}\n\n`;
      textReport += `Expired + Pending: ${stats.expiredPending}\n\n`;
      textReport += `Fully Paid: ${stats.fullyPaid}\n\n`;
      textReport += `Renewed Memberships: ${stats.renewedMemberships}\n\n`;
      textReport += `Inactive Clients: ${stats.inactiveClients}\n\n`;
      textReport += `--------------------------------------------------\n\n`;
    }

    textReport += `==================================================\n\nOVERALL\n\n`;
    textReport += `Total Gyms: ${overall.totalGyms}\n\n`;
    textReport += `Total Clients: ${overall.totalClients}\n\n`;
    textReport += `Active Membership: ${overall.activeMembership}\n\n`;
    textReport += `Expiring Soon: ${overall.expiringSoon}\n\n`;
    textReport += `Membership Expired: ${overall.membershipExpired}\n\n`;
    textReport += `Pending Dues: ${overall.pendingDues}\n\n`;
    textReport += `Reminder 1 Eligible: ${overall.reminder1Eligible}\n\n`;
    textReport += `Reminder 2 Eligible: ${overall.reminder2Eligible}\n\n`;
    textReport += `Reminder 3 Eligible: ${overall.reminder3Eligible}\n\n`;
    textReport += `Expiring Soon + Pending: ${overall.expiringSoonPending}\n\n`;
    textReport += `Expired + Pending: ${overall.expiredPending}\n\n`;
    textReport += `Fully Paid: ${overall.fullyPaid}\n\n`;
    textReport += `Renewed Memberships: ${overall.renewedMemberships}\n\n`;
    textReport += `Execution Time:\n${finalDuration} ms\n`;

    res.status(200).json({
      success: true,
      data: {
        gymsProcessed: gymStats.length,
        executionTime: `${finalDuration}ms`,
        gymStats,
        overall,
        textReport
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Clients for Reminder Testing dropdown
// @route   GET /api/admin/reminder-test/clients
// @access  Private (SuperAdmin, Developer)
exports.getReminderTestClients = async (req, res, next) => {
  try {
    const { gymId } = req.query;
    if (!gymId) {
      return res.status(400).json({ success: false, message: 'gymId is required' });
    }
    const gym = await Gym.findOne({ gymId: gymId.trim().toUpperCase() });
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }
    const { getTenantConnection } = require('../utils/connectionManager');
    const conn = await getTenantConnection(gym.dbName);
    const TenantClient = conn.model('Client');
    const clients = await TenantClient.find({ isActive: true, isDeleted: { $ne: true } }).select('_id clientId personalInfo.name').lean();
    res.status(200).json({ success: true, data: clients });
  } catch (err) {
    next(err);
  }
};

// @desc    Send Single Test Reminder (Expiring Soon, Expired, Due 1, 2, 3)
// @route   POST /api/admin/reminder-test/send
// @access  Private (SuperAdmin, Developer)
exports.sendTestReminder = async (req, res, next) => {
  try {
    const { gymId, clientId, reminderType } = req.body;
    if (!gymId || !clientId || !reminderType) {
      return res.status(400).json({ success: false, message: 'gymId, clientId, and reminderType are required' });
    }

    const gym = await Gym.findOne({ gymId: gymId.trim().toUpperCase() });
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    const { getTenantConnection } = require('../utils/connectionManager');
    const conn = await getTenantConnection(gym.dbName);
    
    const TenantClient = conn.model('Client');
    const client = await TenantClient.findById(clientId);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const metaWhatsAppService = require('../services/metaWhatsAppService');
    const { syncClientStatus } = require('../utils/syncStatus');
    
    // Sync client status first (production pipeline rules)
    await syncClientStatus(client._id);
    const updatedClient = await TenantClient.findById(client._id);

    const cleanPhone = (c) => {
      const rawNum = c.personalInfo?.whatsappNumber || c.whatsappNumber || c.personalInfo?.mobileNo || c.personalInfo?.mobile;
      if (!rawNum) return null;
      let cleaned = String(rawNum).replace(/\D/g, '');
      if (cleaned.startsWith('91') && cleaned.length === 12) {
        cleaned = cleaned.substring(2);
      }
      const indianMobileRegex = /^[6-9]\d{9}$/;
      return indianMobileRegex.test(cleaned) ? cleaned : null;
    };

    const mobile = cleanPhone(updatedClient);
    if (!mobile) {
      return res.status(400).json({ success: false, message: 'Client has no valid WhatsApp number' });
    }
    const formattedWhatsApp = `+91${mobile}`;

    let result = null;
    let logReminderType = '';
    let templateName = '';

    // Find remaining balance first to select templates correctly
    let remainingBalance = 0;
    const activeMembership = [...(updatedClient.memberships || [])]
      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
      .find(m => (m.finalPrice - m.totalPaid) > 0);
    if (activeMembership) {
      remainingBalance = (activeMembership.finalPrice || 0) - (activeMembership.totalPaid || 0);
    }

    if (reminderType === 'expiring_soon') {
      if (remainingBalance > 0) {
        logReminderType = 'Expiring Soon Pending';
        templateName = process.env.META_TEMPLATE_EXPIRING_SOON_PENDING || 'membership_expiring_soon_pending';
      } else {
        logReminderType = 'Expiring Soon';
        templateName = process.env.META_TEMPLATE_EXPIRING_SOON || 'membership_expiring_soon';
      }
      
      const expiryDateString = updatedClient.membership?.endDate
        ? new Date(updatedClient.membership.endDate).toLocaleDateString('en-GB').replace(/\//g, '-')
        : 'N/A';
      const daysLeft = updatedClient.membership?.daysLeft ?? 3;

      if (remainingBalance > 0) {
        result = await metaWhatsAppService.sendExpiringSoonPendingReminder({
          phone: formattedWhatsApp,
          clientName: updatedClient.personalInfo.name,
          gymName: updatedClient.gymName,
          expiryDate: expiryDateString,
          daysLeft: daysLeft,
          pendingAmount: remainingBalance,
          clientId: updatedClient.clientId,
          gymId: gym.gymId
        });
      } else {
        result = await metaWhatsAppService.sendExpiringSoonReminder({
          phone: formattedWhatsApp,
          clientName: updatedClient.personalInfo.name,
          gymName: updatedClient.gymName,
          expiryDate: expiryDateString,
          daysLeft: daysLeft,
          clientId: updatedClient.clientId,
          gymId: gym.gymId
        });
      }
    } else if (reminderType === 'expired') {
      if (remainingBalance > 0) {
        logReminderType = 'Expired Pending';
        templateName = process.env.META_TEMPLATE_EXPIRED_PENDING || 'membership_expired_pending';
      } else {
        logReminderType = 'Expired';
        templateName = process.env.META_TEMPLATE_EXPIRED || 'membership_expired';
      }

      const renewalLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/client/renew/${updatedClient.clientId}`;
      const paymentLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/client/renew/${updatedClient.clientId}?balance=true`;
      const finalRenewalLink = remainingBalance > 0 ? paymentLink : renewalLink;
      const expiryDateString = updatedClient.membership?.endDate
        ? new Date(updatedClient.membership.endDate).toLocaleDateString('en-GB').replace(/\//g, '-')
        : 'N/A';

      if (remainingBalance > 0) {
        result = await metaWhatsAppService.sendExpiredPendingReminder({
          phone: formattedWhatsApp,
          clientName: updatedClient.personalInfo.name,
          gymName: updatedClient.gymName,
          expiryDate: expiryDateString,
          pendingAmount: remainingBalance,
          renewalLink: finalRenewalLink,
          clientId: updatedClient.clientId,
          gymId: gym.gymId
        });
      } else {
        result = await metaWhatsAppService.sendExpiredReminder({
          phone: formattedWhatsApp,
          clientName: updatedClient.personalInfo.name,
          gymName: updatedClient.gymName,
          expiryDate: expiryDateString,
          renewalLink: finalRenewalLink,
          clientId: updatedClient.clientId,
          gymId: gym.gymId
        });
      }
    } else if (reminderType.startsWith('due_')) {
      const stage = parseInt(reminderType.split('_')[1]); // 1, 2, or 3
      
      const m = [...(updatedClient.memberships || [])]
        .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
        .find(mem => (mem.finalPrice - mem.totalPaid) > 0);

      if (!m) {
        return res.status(400).json({ success: false, message: 'Client has no pending/partial balance to send due reminders' });
      }

      const balance = (m.finalPrice || 0) - (m.totalPaid || 0);
      const dueDateString = new Date(m.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-');
      const paymentLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/client/renew/${updatedClient.clientId}?balance=true`;

      logReminderType = `Due Reminder ${stage}`;
      const tempNameMap = {
        1: process.env.META_TEMPLATE_DUE_FIRST || 'due_first_reminder',
        2: process.env.META_TEMPLATE_DUE_SECOND || 'due_second_reminder',
        3: process.env.META_TEMPLATE_DUE_THIRD || 'due_third_reminder'
      };
      templateName = tempNameMap[stage];

      result = await metaWhatsAppService.sendDueReminder({
        phone: formattedWhatsApp,
        clientName: updatedClient.personalInfo.name,
        pendingAmount: balance,
        dueDate: dueDateString,
        renewalLink: paymentLink,
        clientId: updatedClient.clientId,
        gymId: gym.gymId,
        stage
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid reminderType' });
    }

    if (!updatedClient.overdueReminders) {
      updatedClient.overdueReminders = { manualReminders: [], workflowCompleted: false };
    }
    if (!updatedClient.overdueReminders.manualReminders) {
      updatedClient.overdueReminders.manualReminders = [];
    }

    if (result && result.success) {
      updatedClient.overdueReminders.manualReminders.push({
        sentAt: new Date(),
        status: 'sent',
        error: null,
        reminderType: logReminderType,
        templateName,
        executionSource: 'Manual Trigger',
        messageId: result.messageId,
        sentBy: 'Super Admin'
      });

      // Send secondary due reminder if client has outstanding balance
      if (reminderType === 'expiring_soon' || reminderType === 'expired') {
        let remainingBalance = 0;
        const activeMembership = [...(updatedClient.memberships || [])]
          .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
          .find(m => (m.finalPrice - m.totalPaid) > 0);
        if (activeMembership) {
          remainingBalance = (activeMembership.finalPrice || 0) - (activeMembership.totalPaid || 0);
        }

        if (remainingBalance > 0 && activeMembership.dueDate && logReminderType !== 'Expiring Soon Pending' && logReminderType !== 'Expired Pending') {
          const dueDateString = new Date(activeMembership.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-');
          const paymentLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/client/renew/${updatedClient.clientId}?balance=true`;
          
          const dueResult = await metaWhatsAppService.sendDueReminder({
            phone: formattedWhatsApp,
            clientName: updatedClient.personalInfo.name,
            pendingAmount: remainingBalance,
            dueDate: dueDateString,
            renewalLink: paymentLink,
            clientId: updatedClient.clientId,
            gymId: gym.gymId,
            stage: 3
          });

          if (dueResult && dueResult.success) {
            updatedClient.overdueReminders.manualReminders.push({
              sentAt: new Date(),
              status: 'sent',
              error: null,
              reminderType: 'Due Reminder 3',
              templateName: process.env.META_TEMPLATE_DUE_THIRD || 'due_third_reminder',
              executionSource: 'Manual Trigger',
              messageId: dueResult.messageId,
              sentBy: 'Super Admin'
            });
            if (!updatedClient.overdueReminders.reminder3) {
              updatedClient.overdueReminders.reminder3 = {};
            }
            updatedClient.overdueReminders.reminder3.status = 'sent';
            updatedClient.overdueReminders.reminder3.sentAt = new Date();
            updatedClient.overdueReminders.reminder3.error = null;
          } else {
            updatedClient.overdueReminders.manualReminders.push({
              sentAt: new Date(),
              status: 'failed',
              error: dueResult ? dueResult.error : 'Meta send error',
              reminderType: 'Due Reminder 3',
              templateName: process.env.META_TEMPLATE_DUE_THIRD || 'due_third_reminder',
              executionSource: 'Manual Trigger',
              messageId: null,
              sentBy: 'Super Admin'
            });
          }
        }
      }
      
      // Update the specific production flag/status for visual circles:
      if (reminderType === 'expiring_soon') {
        updatedClient.membership.expiryReminderSent = true;
        updatedClient.expiryReminderSent = true;
        updatedClient.membership.expiryReminderStatus = 'sent';
        updatedClient.expiryReminderStatus = 'sent';
        updatedClient.membership.expiryReminderSentAt = new Date();
        updatedClient.expiryReminderSentAt = new Date();
      } else if (reminderType === 'expired') {
        updatedClient.membership.expiredReminderSent = true;
        updatedClient.expiredReminderSent = true;
        updatedClient.membership.expiredReminderStatus = 'sent';
        updatedClient.expiredReminderStatus = 'sent';
        updatedClient.membership.expiredReminderSentAt = new Date();
        updatedClient.expiredReminderSentAt = new Date();
      } else if (reminderType.startsWith('due_')) {
        const stage = parseInt(reminderType.split('_')[1]);
        updatedClient.overdueReminders[`reminder${stage}`] = {
          status: 'sent',
          sentAt: new Date(),
          error: null
        };
      }

      await updatedClient.save();
      res.status(200).json({ success: true, message: 'Test reminder sent successfully', data: result });
    } else {
      const errorStr = result?.error || 'Meta Cloud API message send failed';
      updatedClient.overdueReminders.manualReminders.push({
        sentAt: new Date(),
        status: 'failed',
        error: errorStr,
        reminderType: logReminderType,
        templateName,
        executionSource: 'Manual Trigger',
        messageId: null,
        sentBy: 'Super Admin'
      });

      if (reminderType === 'expiring_soon') {
        updatedClient.membership.expiryReminderStatus = 'failed';
        updatedClient.expiryReminderStatus = 'failed';
        updatedClient.membership.expiryReminderError = errorStr;
        updatedClient.expiryReminderError = errorStr;
      } else if (reminderType === 'expired') {
        updatedClient.membership.expiredReminderStatus = 'failed';
        updatedClient.expiredReminderStatus = 'failed';
        updatedClient.membership.expiredReminderError = errorStr;
        updatedClient.expiredReminderError = errorStr;
      } else if (reminderType.startsWith('due_')) {
        const stage = parseInt(reminderType.split('_')[1]);
        updatedClient.overdueReminders[`reminder${stage}`] = {
          status: 'failed',
          sentAt: new Date(),
          error: errorStr
        };
      }

      await updatedClient.save();
      res.status(500).json({ success: false, message: 'Test reminder failed to send', error: errorStr });
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Run automated cron job manually
// @route   POST /api/admin/reminder-test/run-cron
// @access  Private (SuperAdmin, Developer)
exports.runTestCron = async (req, res, next) => {
  try {
    const { cronName, gymId, clientId } = req.body; // 'membership', 'overdue', or 'all'
    if (!cronName) {
      return res.status(400).json({ success: false, message: 'cronName is required' });
    }

    let stats = null;
    if (cronName === 'membership') {
      const { runReminders } = require('../jobs/reminderJob');
      stats = await runReminders({ executionSource: 'Automatic Cron', gymId, clientId });
    } else if (cronName === 'overdue') {
      const { runOverdueReminders } = require('../jobs/overdueReminderJob');
      stats = await runOverdueReminders({ executionSource: 'Automatic Cron', gymId, clientId });
    } else if (cronName === 'all') {
      const { runReminders } = require('../jobs/reminderJob');
      const { runOverdueReminders } = require('../jobs/overdueReminderJob');

      const membershipStats = await runReminders({ executionSource: 'Automatic Cron', gymId, clientId });
      const overdueStats = await runOverdueReminders({ executionSource: 'Automatic Cron', gymId, clientId });

      stats = {
        cronName: 'Reminder Automation (All)',
        processedClients: (membershipStats?.processedClients || 0) + (overdueStats?.processedClients || 0),
        successfulMessages: (membershipStats?.successfulMessages || 0) + (overdueStats?.successfulMessages || 0),
        failedMessages: (membershipStats?.failedMessages || 0) + (overdueStats?.failedMessages || 0),
        skippedClients: (membershipStats?.skippedClients || 0) + (overdueStats?.skippedClients || 0),
        durationMs: (membershipStats?.durationMs || 0) + (overdueStats?.durationMs || 0),
        errors: [...(membershipStats?.errors || []), ...(overdueStats?.errors || [])],
        executionTime: membershipStats?.executionTime || new Date().toISOString()
      };
    } else {
      return res.status(400).json({ success: false, message: 'Invalid cronName' });
    }

    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

// @desc    Get flattened reminder history logs for a Gym
// @route   GET /api/admin/reminder-test/history
// @access  Private (SuperAdmin, Developer)
exports.getReminderHistory = async (req, res, next) => {
  try {
    const { gymId } = req.query;
    if (!gymId) {
      return res.status(400).json({ success: false, message: 'gymId is required' });
    }

    const gym = await Gym.findOne({ gymId: gymId.trim().toUpperCase() });
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    const { getTenantConnection } = require('../utils/connectionManager');
    const conn = await getTenantConnection(gym.dbName);
    const TenantClient = conn.model('Client');
    
    const clients = await TenantClient.find({ isDeleted: { $ne: true } }).lean();

    const history = [];
    for (const client of clients) {
      const manualReminders = client.overdueReminders?.manualReminders || [];
      for (const r of manualReminders) {
        const sentAtDate = r.sentAt ? new Date(r.sentAt) : null;
        history.push({
          _id: r._id,
          reminderType: r.reminderType || 'Unknown',
          templateName: r.templateName || 'N/A',
          clientId: client.clientId,
          clientName: client.personalInfo?.name || 'Client',
          gymId: gym.gymId,
          gymName: gym.gymName,
          executionSource: r.executionSource || 'Manual Trigger',
          date: sentAtDate ? sentAtDate.toLocaleDateString('en-GB').replace(/\//g, '-') : 'N/A',
          time: sentAtDate ? sentAtDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : 'N/A',
          sentAt: r.sentAt,
          status: r.status || 'sent',
          messageId: r.messageId || 'N/A',
          error: r.error || null
        });
      }
    }

    // Sort by sentAt descending
    history.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

    res.status(200).json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
};

// @desc    Clear reminder history logs for a Gym
// @route   POST /api/admin/reminder-test/clear-history
// @access  Private (SuperAdmin, Developer)
exports.clearReminderHistory = async (req, res, next) => {
  try {
    const { gymId } = req.body;
    if (!gymId) {
      return res.status(400).json({ success: false, message: 'gymId is required' });
    }
    const gym = await Gym.findOne({ gymId: gymId.trim().toUpperCase() });
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    const { getTenantConnection } = require('../utils/connectionManager');
    const conn = await getTenantConnection(gym.dbName);
    const TenantClient = conn.model('Client');

    // Reset reminder statuses and history for all clients in this gym
    await TenantClient.updateMany(
      { isDeleted: { $ne: true } },
      { 
        $set: { 
          'overdueReminders.manualReminders': [],
          'overdueReminders.reminder1': { status: 'pending', sentAt: null, error: null },
          'overdueReminders.reminder2': { status: 'pending', sentAt: null, error: null },
          'overdueReminders.reminder3': { status: 'pending', sentAt: null, error: null },
          'overdueReminders.workflowCompleted': false,
          'expiryReminderSent': false,
          'membership.expiryReminderStatus': 'pending',
          'membership.expiryReminderSentAt': null,
          'membership.expiryReminderError': null,
          'expiredReminderSent': false,
          'membership.expiredReminderStatus': 'pending',
          'membership.expiredReminderStatusSentAt': null,
          'membership.expiredReminderError': null
        } 
      }
    );

    res.status(200).json({ success: true, message: 'Reminder history logs cleared successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Manually trigger all reminder jobs (Expiry + Overdue)
// @route   POST /api/admin/run-reminders
// @access  Private (SuperAdmin only)
exports.triggerRunReminders = async (req, res, next) => {
  try {
    const { runReminders } = require('../jobs/reminderJob');
    const { runOverdueReminders } = require('../jobs/overdueReminderJob');

    console.log(`[Admin] Manual reminder trigger initiated by Super Admin (id: ${req.user?._id})`);

    const membershipStats = await runReminders({ executionSource: 'Manual Admin Trigger' });
    const overdueStats = await runOverdueReminders({ executionSource: 'Manual Admin Trigger' });

    res.status(200).json({
      success: true,
      message: 'All reminder jobs executed successfully.',
      data: {
        membershipReminders: membershipStats,
        overdueReminders: overdueStats
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Bulk Import Clients from client-parsed Excel JSON
// @route   POST /api/admin/bulk-import
// @access  Private (SuperAdmin, Developer)
exports.bulkImportClients = async (req, res, next) => {
  const { gymId, clients } = req.body;

  if (!gymId) {
    return res.status(400).json({ success: false, message: 'gymId is required' });
  }
  if (!clients || !Array.isArray(clients)) {
    return res.status(400).json({ success: false, message: 'clients must be an array of objects' });
  }

  try {
    const gym = await Gym.findOne({ gymId: gymId.trim().toUpperCase() });
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    const { getTenantConnection } = require('../utils/connectionManager');
    const { runWithTenantContext } = require('../utils/tenantContext');
    const { buildMembershipWindow } = require('../utils/membership');
    const { generateClientId, generatePaymentId } = require('../utils/generateId');
    const { syncClientStatus } = require('../utils/syncStatus');

    const conn = await getTenantConnection(gym.dbName);
    const TenantClient = conn.model('Client');
    const TenantPlan = conn.model('Plan');
    const TenantPayment = conn.model('Payment');
    const TenantCounter = conn.model('Counter');

    let rowsProcessed = clients.length;
    let importedSuccessfully = 0;
    let failed = 0;
    let partialPayments = 0;
    let fullPayments = 0;
    const errors = [];

    const parseExcelDate = (val) => {
      if (!val) return null;
      if (val instanceof Date) return val;
      if (typeof val === 'number') {
        return new Date(Math.round((val - 25569) * 86400 * 1000));
      }
      if (typeof val === 'string') {
        const parts = val.trim().split(/[-/]/);
        if (parts.length === 3) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
            return new Date(y, m, d);
          }
        }
      }
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) return parsed;
      return null;
    };

    const validateClientRow = (row) => {
      const name = row['Client Name']?.toString().trim();
      const gender = row['Gender']?.toString().trim();
      const email = row['Email']?.toString().trim();
      const dobStr = row['DOB (DD-MM-YYYY)'];
      const mobileNo = row['Mobile Number']?.toString().trim();
      const emergencyContact = row['Emergency Contact']?.toString().trim();
      const address = row['Address']?.toString().trim();
      const state = row['State']?.toString().trim();
      const city = row['City']?.toString().trim();
      const pincode = row['Pincode']?.toString().trim();
      const password = row['Password']?.toString();
      const confirmPassword = row['Confirm Password']?.toString();
      const planName = row['Membership Plan']?.toString().trim();
      const startDateStr = row['Membership Start Date (DD-MM-YYYY)'];
      const paidAmountRaw = row['Paid Amount'];

      if (!name) throw new Error('Client Name is required');
      if (!gender) throw new Error('Gender is required');
      if (!email) throw new Error('Email is required');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid Email format');
      if (!mobileNo) throw new Error('Mobile Number is required');
      if (!address) throw new Error('Address is required');
      if (!password) throw new Error('Password is required');
      if (password !== confirmPassword) throw new Error('Passwords do not match');
      if (!planName) throw new Error('Membership Plan is required');

      const dob = parseExcelDate(dobStr);
      if (!dob || isNaN(dob.getTime())) throw new Error('Invalid DOB');
      
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 14) throw new Error('Client must be at least 14 years old');
      if (age > 100) throw new Error('Invalid Date of Birth (max 100 years old)');

      const startDate = parseExcelDate(startDateStr);
      if (!startDate || isNaN(startDate.getTime())) throw new Error('Invalid Membership Start Date');

      today.setHours(0, 0, 0, 0);
      const maxDate = new Date(today);
      maxDate.setDate(today.getDate() + 90);
      const startVal = new Date(startDate);
      startVal.setHours(0, 0, 0, 0);
      if (startVal > maxDate) throw new Error('Start date cannot be more than 90 days in the future');

      if (paidAmountRaw === undefined || paidAmountRaw === null || paidAmountRaw === '') {
        throw new Error('Paid Amount is required');
      }
      const paidAmount = Number(paidAmountRaw);
      if (isNaN(paidAmount) || paidAmount < 0) throw new Error('Invalid Paid Amount');

      return {
        name,
        gender,
        email,
        dob,
        mobileNo,
        emergencyContact: emergencyContact || '',
        address: address || '',
        state: state || '',
        city: city || '',
        pincode: pincode || '',
        password,
        planName,
        startDate,
        paidAmount
      };
    };

    await runWithTenantContext({ tenantDb: conn, models: { Client: TenantClient, Plan: TenantPlan, Payment: TenantPayment, Counter: TenantCounter } }, async () => {
      for (let i = 0; i < clients.length; i++) {
        const row = clients[i];
        const rowNum = i + 2;
        let clientName = row['Client Name'] || 'Unknown';

        try {
          // 1. Validate Row data
          const validated = validateClientRow(row);
          clientName = validated.name;

          // 2. Check if client exists (email or mobile) in tenant DB
          const clientExists = await TenantClient.findOne({
            $or: [
              { 'personalInfo.email': validated.email },
              { 'personalInfo.mobileNo': validated.mobileNo }
            ]
          });
          if (clientExists) {
            if (clientExists.personalInfo.email === validated.email) {
              throw new Error('Email already exists');
            } else {
              throw new Error('Mobile number already exists');
            }
          }

          // 3. Find Membership Plan
          const plan = await TenantPlan.findOne({ name: { $regex: new RegExp(`^${validated.planName}$`, 'i') }, isActive: true });
          if (!plan) {
            throw new Error('Membership Plan not found');
          }

          const planPriceVal = plan.price;
          const paidAmountVal = validated.paidAmount;
          const remainingBalanceVal = Math.max(0, planPriceVal - paidAmountVal);

          let resolvedDueDate = null;
          if (remainingBalanceVal > 0) {
            if (paidAmountVal <= 100) {
              throw new Error('You must pay an amount greater than ₹100 for partial payment.');
            }
            const dueDays = plan.partialPaymentDueDays ?? 15;
            const startVal = new Date(validated.startDate);
            startVal.setHours(0, 0, 0, 0);
            resolvedDueDate = new Date(startVal);
            resolvedDueDate.setDate(resolvedDueDate.getDate() + dueDays);
            resolvedDueDate.setHours(0, 0, 0, 0);
          }

          const membershipWindow = buildMembershipWindow({ startDate: validated.startDate, durationMonths: plan.durationMonths });

          // 4. Generate client ID and Payment ID
          const clientId = await generateClientId(gym.gymId);
          const paymentId = await generatePaymentId(gym.gymId, gym.billingInfo?.billingIdPrefix || 'BILL');

          // 5. Create Client
          const client = await TenantClient.create({
            clientId,
            gymId: gym.gymId,
            gymName: gym.gymName,
            personalInfo: {
              name: validated.name,
              gender: validated.gender,
              email: validated.email,
              dob: validated.dob,
              mobileNo: validated.mobileNo,
              emergencyContact: validated.emergencyContact,
              address: validated.address,
              state: validated.state,
              city: validated.city,
              pincode: validated.pincode
            },
            password: validated.password,
            avatar: validated.name.charAt(0).toUpperCase(),
            hasPartialPayment: paidAmountVal > 0 && paidAmountVal < planPriceVal,
            paymentStatus: paidAmountVal >= planPriceVal ? 'paid' : (paidAmountVal > 0 ? 'partial' : 'overdue'),
            overdueReminders: {
              reminder1: { status: 'none', sentAt: null, error: null },
              reminder2: { status: 'none', sentAt: null, error: null },
              reminder3: { status: 'none', sentAt: null, error: null },
              manualReminders: [],
              workflowCompleted: (remainingBalanceVal === 0)
            },
            memberships: [{
              planId: plan._id,
              planName: plan.name,
              planDurationMonths: plan.durationMonths,
              startDate: membershipWindow.startDate,
              endDate: membershipWindow.endDate,
              finalPrice: planPriceVal,
              totalPaid: paidAmountVal,
              dueDate: resolvedDueDate
            }],
            membership: {
              planId: plan._id,
              planName: plan.name,
              planDurationMonths: plan.durationMonths,
              durationMonths: plan.durationMonths,
              startDate: membershipWindow.startDate,
              endDate: membershipWindow.endDate,
              daysLeft: membershipWindow.daysLeft,
              requestApproved: true
            }
          });

          // 6. Create Payment
          let paymentRecord;
          try {
            paymentRecord = await TenantPayment.create({
              paymentId,
              gymId: gym.gymId,
              clientId: client._id.toString(),
              clientName: validated.name,
              planId: plan._id,
              planName: plan.name,
              amount: planPriceVal,
              paidAmount: paidAmountVal,
              invoiceAmount: planPriceVal,
              paidNow: paidAmountVal,
              totalPaid: paidAmountVal,
              remainingBalance: remainingBalanceVal,
              status: paidAmountVal >= planPriceVal ? 'paid' : (paidAmountVal > 0 ? 'partial' : 'overdue'),
              paymentMethod: 'cash',
              dueDate: resolvedDueDate,
              startDate: membershipWindow.startDate,
              isPlanActivated: true
            });
          } catch (paymentErr) {
            await TenantClient.deleteOne({ _id: client._id });
            throw new Error(`Payment creation failed — rolled back client. ${paymentErr.message}`);
          }

          // Link Payment to Client History
          await TenantClient.updateOne(
            { _id: client._id },
            { $set: { paymentHistory: [paymentRecord._id] } }
          );

          // Authoritative sync to ensure state compliance
          await syncClientStatus(client._id);

          importedSuccessfully++;
          if (remainingBalanceVal > 0) {
            partialPayments++;
          } else {
            fullPayments++;
          }
        } catch (err) {
          failed++;
          errors.push({
            rowNumber: `Row ${rowNum}`,
            clientName,
            reason: err.message || 'Unknown processing error'
          });
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        gymName: `${gym.gymId} - ${gym.gymName}`,
        rowsProcessed,
        importedSuccessfully,
        failed,
        clientsCreated: importedSuccessfully,
        invoicesCreated: importedSuccessfully,
        paymentsCreated: importedSuccessfully,
        partialPayments,
        fullPayments,
        errors
      }
    });
  } catch (err) {
    next(err);
  }
};
