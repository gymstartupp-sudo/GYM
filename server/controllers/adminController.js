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

// @desc    Trigger Overdue Check manually
// @route   POST /api/admin/overdue-check
// @access  Private (SuperAdmin)
exports.triggerOverdueCheck = async (req, res, next) => {
  try {
    const { runOverdueCheck } = require('../jobs/statusUpdater');
    const stats = await runOverdueCheck();

    res.status(200).json({
      success: true,
      data: stats
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
    const clients = await TenantClient.find({ isActive: true, isDeleted: { $ne: true } }).select('_id personalInfo.name').lean();
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

    if (reminderType === 'expiring_soon') {
      logReminderType = 'Expiring Soon';
      templateName = process.env.META_TEMPLATE_EXPIRING_SOON || 'membership_expiring_soon';
      
      const expiryDateString = updatedClient.membership?.endDate
        ? new Date(updatedClient.membership.endDate).toLocaleDateString('en-GB').replace(/\//g, '-')
        : 'N/A';
      const daysLeft = updatedClient.membership?.daysLeft ?? 3;

      result = await metaWhatsAppService.sendExpiringSoonReminder({
        phone: formattedWhatsApp,
        clientName: updatedClient.personalInfo.name,
        gymName: updatedClient.gymName,
        expiryDate: expiryDateString,
        daysLeft: daysLeft,
        clientId: updatedClient.clientId,
        gymId: gym.gymId
      });
    } else if (reminderType === 'expired') {
      logReminderType = 'Expired';
      templateName = process.env.META_TEMPLATE_EXPIRED || 'membership_expired';

      // Find remaining balance for payment link calculation
      let remainingBalance = 0;
      const activeMembership = [...(updatedClient.memberships || [])]
        .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
        .find(m => (m.finalPrice - m.totalPaid) > 0);
      if (activeMembership) {
        remainingBalance = (activeMembership.finalPrice || 0) - (activeMembership.totalPaid || 0);
      }

      const renewalLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/client/renew/${updatedClient.clientId}`;
      const paymentLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/client/renew/${updatedClient.clientId}?balance=true`;
      const finalRenewalLink = remainingBalance > 0 ? paymentLink : renewalLink;
      const expiryDateString = updatedClient.membership?.endDate
        ? new Date(updatedClient.membership.endDate).toLocaleDateString('en-GB').replace(/\//g, '-')
        : 'N/A';

      result = await metaWhatsAppService.sendExpiredReminder({
        phone: formattedWhatsApp,
        clientName: updatedClient.personalInfo.name,
        gymName: updatedClient.gymName,
        expiryDate: expiryDateString,
        renewalLink: finalRenewalLink,
        clientId: updatedClient.clientId,
        gymId: gym.gymId
      });
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

        if (remainingBalance > 0 && activeMembership.dueDate) {
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
    const { cronName } = req.body; // 'membership' or 'overdue'
    if (!cronName) {
      return res.status(400).json({ success: false, message: 'cronName is required' });
    }

    let stats = null;
    if (cronName === 'membership') {
      const { runReminders } = require('../jobs/reminderJob');
      stats = await runReminders({ executionSource: 'Automatic Cron' });
    } else if (cronName === 'overdue') {
      const { runOverdueReminders } = require('../jobs/overdueReminderJob');
      stats = await runOverdueReminders({ executionSource: 'Automatic Cron' });
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
