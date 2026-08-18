const cron = require('node-cron');
const Client = require('../models/Client');
const Gym = require('../models/Gym');
const metaWhatsAppService = require('../services/metaWhatsAppService');
const { syncClientStatus } = require('../utils/syncStatus');
const { getTenantConnection } = require('../utils/connectionManager');
const { runWithTenantContext } = require('../utils/tenantContext');

// Helper to validate and format Indian mobile numbers
const getValidWhatsAppNumber = (client) => {
  const rawNum = client.personalInfo?.whatsappNumber || client.whatsappNumber || client.personalInfo?.mobileNo || client.personalInfo?.mobile;
  if (!rawNum) return null;

  // Strip all non-digit characters
  let cleaned = String(rawNum).replace(/\D/g, '');

  // Remove leading country code if 91 and length is 12 digits
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  }

  // Support valid Indian numbers only: ^[6-9]\d{9}$
  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (indianMobileRegex.test(cleaned)) {
    return cleaned; // returns 10 digit clean string
  }
  return null;
};

const sendSecondaryDueReminder = async (updatedClient, formattedWhatsApp, gymId, executionSource) => {
  const activeMembership = [...(updatedClient.memberships || [])]
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
    .find(m => (m.finalPrice - m.totalPaid) > 0);

  if (!activeMembership || !activeMembership.dueDate) return;

  const remainingBalance = (activeMembership.finalPrice || 0) - (activeMembership.totalPaid || 0);
  if (remainingBalance <= 0) return;

  const dueDateString = new Date(activeMembership.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-');
  const paymentLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/client/renew/${updatedClient.clientId}?balance=true`;

  const dueResult = await metaWhatsAppService.sendDueReminder({
    phone: formattedWhatsApp,
    clientName: updatedClient.personalInfo.name,
    pendingAmount: remainingBalance,
    dueDate: dueDateString,
    renewalLink: paymentLink,
    clientId: updatedClient.clientId,
    gymId: gymId,
    stage: 3
  });

  if (!updatedClient.overdueReminders) {
    updatedClient.overdueReminders = {};
  }
  if (!updatedClient.overdueReminders.manualReminders) {
    updatedClient.overdueReminders.manualReminders = [];
  }

  if (dueResult && dueResult.success) {
    updatedClient.overdueReminders.manualReminders.push({
      sentAt: new Date(),
      status: 'sent',
      error: null,
      reminderType: 'Due Reminder 3',
      templateName: process.env.META_TEMPLATE_DUE_THIRD || 'due_third_reminder',
      executionSource: executionSource || 'Automatic Cron',
      messageId: dueResult.messageId
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
      executionSource: executionSource || 'Automatic Cron',
      messageId: null
    });
  }
  await updatedClient.save();
};

// Reusable function to run the reminder checks
const runReminders = async (options = {}) => {
  console.log('--- Starting WhatsApp Expiry Reminders Job ---');
  const startTime = Date.now();
  const stats = {
    executionTime: new Date().toISOString(),
    cronName: 'Membership Expiry Reminders',
    processedClients: 0,
    successfulMessages: 0,
    failedMessages: 0,
    skippedClients: 0,
    errors: [],
    durationMs: 0
  };

  try {
    let gyms = [];
    if (options.gymId) {
      const gym = await Gym.findOne({ gymId: options.gymId.toUpperCase() });
      if (gym) gyms = [gym];
    } else {
      gyms = await Gym.find({ isActive: true });
    }

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
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Fetch all active clients, potentially filtering by clientId
          const query = { isActive: true, isDeleted: { $ne: true }, 'membership.requestApproved': true };
          if (options.clientId && options.clientId !== 'all' && options.clientId !== 'ALL') {
            const clientIdsArray = Array.isArray(options.clientId) ? options.clientId : [options.clientId];
            if (clientIdsArray.length > 0 && !clientIdsArray.includes('all') && !clientIdsArray.includes('ALL')) {
              const mongoose = require('mongoose');
              const orConditions = [];
              clientIdsArray.forEach(id => {
                if (mongoose.Types.ObjectId.isValid(id)) {
                  orConditions.push({ _id: id });
                }
                orConditions.push({ clientId: id });
              });
              if (orConditions.length > 0) {
                query.$or = orConditions;
              }
            }
          }
          const clients = await Client.find(query);
          console.log(`[Gym: ${gym.gymId}] Found ${clients.length} clients to process.`);

          for (let client of clients) {
            // 1. Sync latest memberships from payment history and client records
            await syncClientStatus(client._id);

            // Fetch latest document after sync
            const updatedClient = await Client.findById(client._id);
            if (!updatedClient || !updatedClient.membership || !updatedClient.membership.endDate) {
              console.log(`Client ${client.personalInfo?.name || 'Unknown'} has no active membership plan to calculate.`);
              continue;
            }

            // 2. Read daysLeft from the synced membership field
            const daysLeft = updatedClient.membership.daysLeft;

            // Flag Reset Rules:
            // If renewed, reset expiryReminderSent (daysLeft > 3)
            if (daysLeft > 3) {
              updatedClient.membership.expiryReminderSent = false;
              updatedClient.expiryReminderSent = false;
              updatedClient.membership.expiryReminderStatus = 'none';
              updatedClient.expiryReminderStatus = 'none';
              updatedClient.membership.expiryReminderError = null;
              updatedClient.expiryReminderError = null;
              updatedClient.membership.expiryReminderSentAt = null;
              updatedClient.expiryReminderSentAt = null;
            }
            // If active again, reset expiredReminderSent (daysLeft >= 0)
            if (daysLeft >= 0) {
              updatedClient.membership.expiredReminderSent = false;
              updatedClient.expiredReminderSent = false;
              updatedClient.membership.expiredReminderStatus = 'none';
              updatedClient.expiredReminderStatus = 'none';
              updatedClient.membership.expiredReminderError = null;
              updatedClient.expiredReminderError = null;
              updatedClient.membership.expiredReminderSentAt = null;
              updatedClient.expiredReminderSentAt = null;
            }

            await updatedClient.save();

            // 3. Validation Rules (Skip invalid or dummy numbers)
            const cleanMobile = getValidWhatsAppNumber(updatedClient);
            const formattedWhatsApp = cleanMobile ? `+91${cleanMobile}` : null;

            // Log Info placeholders
            let reminderType = 'None';
            let twilioStatus = 'Skipped'; // Keep name to match existing state logic
            let failureReason = '';
            let templateName = '';
            let messageId = null;

            let remainingBalance = 0;
            if (updatedClient.paymentStatus === 'partial' || updatedClient.paymentStatus === 'overdue') {
              const activeMembership = [...(updatedClient.memberships || [])]
                .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
                .find(m => {
                  const finalPrice = m.finalPrice || 0;
                  const totalPaid = m.totalPaid || 0;
                  return (finalPrice - totalPaid) > 0;
                });
              if (activeMembership) {
                remainingBalance = (activeMembership.finalPrice || 0) - (activeMembership.totalPaid || 0);
              }
            }

            if (daysLeft === 3) {
              if (remainingBalance > 0) {
                reminderType = 'Expiring Soon Pending';
                templateName = process.env.META_TEMPLATE_EXPIRING_SOON_PENDING || 'membership_expiring_soon_pending';
              } else {
                reminderType = 'Expiring Soon';
                templateName = process.env.META_TEMPLATE_EXPIRING_SOON || 'membership_expiring_soon';
              }
              stats.processedClients++;
              if (!cleanMobile) {
                twilioStatus = 'Failed';
                failureReason = 'Invalid/Dummy WhatsApp number';
                updatedClient.membership.expiryReminderStatus = 'failed';
                updatedClient.expiryReminderStatus = 'failed';
                updatedClient.membership.expiryReminderError = failureReason;
                updatedClient.expiryReminderError = failureReason;
                updatedClient.membership.expiryReminderSentAt = new Date();
                updatedClient.expiryReminderSentAt = new Date();

                // Save failed log to history
                if (!updatedClient.overdueReminders) updatedClient.overdueReminders = {};
                if (!updatedClient.overdueReminders.manualReminders) updatedClient.overdueReminders.manualReminders = [];
                updatedClient.overdueReminders.manualReminders.push({
                  sentAt: new Date(),
                  status: 'failed',
                  error: failureReason,
                  reminderType,
                  templateName,
                  executionSource: options.executionSource || 'Automatic Cron',
                  messageId: null
                });

                await updatedClient.save();
                stats.failedMessages++;
                stats.errors.push({ client: updatedClient.personalInfo.name, reminderType, error: failureReason });
              } else {
                // Check duplicate flag
                const isSent = updatedClient.membership.expiryReminderSent || updatedClient.expiryReminderSent;
                if (isSent) {
                  twilioStatus = 'Skipped';
                  failureReason = 'Reminder already sent today (Duplicate Prevention)';
                  stats.skippedClients++;
                } else {
                  // Send Expiring Soon / Expiring Soon Pending Reminder
                  const expiryDateString = updatedClient.membership.endDate
                    ? new Date(updatedClient.membership.endDate).toLocaleDateString('en-GB').replace(/\//g, '-')
                    : 'N/A';

                  let result;
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

                  if (result && result.success) {
                    twilioStatus = 'Success';
                    messageId = result.messageId;
                    updatedClient.membership.expiryReminderSent = true;
                    updatedClient.expiryReminderSent = true;
                    updatedClient.membership.expiryReminderStatus = 'sent';
                    updatedClient.expiryReminderStatus = 'sent';
                    updatedClient.membership.expiryReminderError = null;
                    updatedClient.expiryReminderError = null;
                    updatedClient.membership.expiryReminderSentAt = new Date();
                    updatedClient.expiryReminderSentAt = new Date();

                    // Save sent log to history
                    if (!updatedClient.overdueReminders) updatedClient.overdueReminders = {};
                    if (!updatedClient.overdueReminders.manualReminders) updatedClient.overdueReminders.manualReminders = [];
                    updatedClient.overdueReminders.manualReminders.push({
                      sentAt: new Date(),
                      status: 'sent',
                      error: null,
                      reminderType,
                      templateName,
                      executionSource: options.executionSource || 'Automatic Cron',
                      messageId
                    });

                    await updatedClient.save();
                    stats.successfulMessages++;

                    // Send secondary due reminder if client has outstanding balance
                    if (remainingBalance > 0 && reminderType !== 'Expiring Soon Pending') {
                      await sendSecondaryDueReminder(updatedClient, formattedWhatsApp, gym.gymId, options.executionSource);
                    }
                  } else {
                    twilioStatus = 'Failed';
                    failureReason = result ? result.error : 'Meta send error';
                    updatedClient.membership.expiryReminderStatus = 'failed';
                    updatedClient.expiryReminderStatus = 'failed';
                    updatedClient.membership.expiryReminderError = failureReason;
                    updatedClient.expiryReminderError = failureReason;
                    updatedClient.membership.expiryReminderSentAt = new Date();
                    updatedClient.expiryReminderSentAt = new Date();

                    // Save failed log to history
                    if (!updatedClient.overdueReminders) updatedClient.overdueReminders = {};
                    if (!updatedClient.overdueReminders.manualReminders) updatedClient.overdueReminders.manualReminders = [];
                    updatedClient.overdueReminders.manualReminders.push({
                      sentAt: new Date(),
                      status: 'failed',
                      error: failureReason,
                      reminderType,
                      templateName,
                      executionSource: options.executionSource || 'Automatic Cron',
                      messageId: null
                    });

                    await updatedClient.save();
                    stats.failedMessages++;
                    stats.errors.push({ client: updatedClient.personalInfo.name, reminderType, error: failureReason });
                  }
                }
              }
            } else if (daysLeft <= 0) {
              if (remainingBalance > 0) {
                reminderType = 'Expired Pending';
                templateName = process.env.META_TEMPLATE_EXPIRED_PENDING || 'membership_expired_pending';
              } else {
                reminderType = 'Expired';
                templateName = process.env.META_TEMPLATE_EXPIRED || 'membership_expired';
              }
              stats.processedClients++;
              if (!cleanMobile) {
                twilioStatus = 'Failed';
                failureReason = 'Invalid/Dummy WhatsApp number';
                updatedClient.membership.expiredReminderStatus = 'failed';
                updatedClient.expiredReminderStatus = 'failed';
                updatedClient.membership.expiredReminderError = failureReason;
                updatedClient.expiredReminderError = failureReason;
                updatedClient.membership.expiredReminderSentAt = new Date();
                updatedClient.expiredReminderSentAt = new Date();

                // Save failed log to history
                if (!updatedClient.overdueReminders) updatedClient.overdueReminders = {};
                if (!updatedClient.overdueReminders.manualReminders) updatedClient.overdueReminders.manualReminders = [];
                updatedClient.overdueReminders.manualReminders.push({
                  sentAt: new Date(),
                  status: 'failed',
                  error: failureReason,
                  reminderType,
                  templateName,
                  executionSource: options.executionSource || 'Automatic Cron',
                  messageId: null
                });

                await updatedClient.save();
                stats.failedMessages++;
                stats.errors.push({ client: updatedClient.personalInfo.name, reminderType, error: failureReason });
              } else {
                // Check duplicate flag
                const isSent = updatedClient.membership.expiredReminderSent || updatedClient.expiredReminderSent;
                if (isSent) {
                  twilioStatus = 'Skipped';
                  failureReason = 'Reminder already sent today (Duplicate Prevention)';
                  stats.skippedClients++;
                } else {
                  // Send Expired / Expired Pending Reminder
                  const renewalLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/client/renew/${updatedClient.clientId}`;
                  const paymentLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/client/renew/${updatedClient.clientId}?balance=true`;
                  const finalRenewalLink = remainingBalance > 0 ? paymentLink : renewalLink;
                  const expiryDateString = updatedClient.membership.endDate
                    ? new Date(updatedClient.membership.endDate).toLocaleDateString('en-GB').replace(/\//g, '-')
                    : 'N/A';

                  let result;
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

                  if (result && result.success) {
                    twilioStatus = 'Success';
                    messageId = result.messageId;
                    updatedClient.membership.expiredReminderSent = true;
                    updatedClient.expiredReminderSent = true;
                    updatedClient.membership.expiredReminderStatus = 'sent';
                    updatedClient.expiredReminderStatus = 'sent';
                    updatedClient.membership.expiredReminderError = null;
                    updatedClient.expiredReminderError = null;
                    updatedClient.membership.expiredReminderSentAt = new Date();
                    updatedClient.expiredReminderSentAt = new Date();

                    // Save sent log to history
                    if (!updatedClient.overdueReminders) updatedClient.overdueReminders = {};
                    if (!updatedClient.overdueReminders.manualReminders) updatedClient.overdueReminders.manualReminders = [];
                    updatedClient.overdueReminders.manualReminders.push({
                      sentAt: new Date(),
                      status: 'sent',
                      error: null,
                      reminderType,
                      templateName,
                      executionSource: options.executionSource || 'Automatic Cron',
                      messageId
                    });

                    await updatedClient.save();
                    stats.successfulMessages++;

                    // Send secondary due reminder if client has outstanding balance
                    if (remainingBalance > 0 && reminderType !== 'Expired Pending') {
                      await sendSecondaryDueReminder(updatedClient, formattedWhatsApp, gym.gymId, options.executionSource);
                    }
                  } else {
                    twilioStatus = 'Failed';
                    failureReason = result ? result.error : 'Meta send error';
                    updatedClient.membership.expiredReminderStatus = 'failed';
                    updatedClient.expiredReminderStatus = 'failed';
                    updatedClient.membership.expiredReminderError = failureReason;
                    updatedClient.expiredReminderError = failureReason;
                    updatedClient.membership.expiredReminderSentAt = new Date();
                    updatedClient.expiredReminderSentAt = new Date();

                    // Save failed log to history
                    if (!updatedClient.overdueReminders) updatedClient.overdueReminders = {};
                    if (!updatedClient.overdueReminders.manualReminders) updatedClient.overdueReminders.manualReminders = [];
                    updatedClient.overdueReminders.manualReminders.push({
                      sentAt: new Date(),
                      status: 'failed',
                      error: failureReason,
                      reminderType,
                      templateName,
                      executionSource: options.executionSource || 'Automatic Cron',
                      messageId: null
                    });

                    await updatedClient.save();
                    stats.failedMessages++;
                    stats.errors.push({ client: updatedClient.personalInfo.name, reminderType, error: failureReason });
                  }
                }
              }
            } else {
              stats.skippedClients++;
            }

            // 4. Output detailed terminal logs
            console.log(`[CLIENT PROCESSED]
- Client Name     : ${updatedClient.personalInfo.name}
- Client ID       : ${updatedClient.clientId}
- WhatsApp Number : ${formattedWhatsApp || 'Invalid (' + (updatedClient.personalInfo?.mobileNo || 'N/A') + ')'}
- daysLeft        : ${daysLeft}
- Reminder Type   : ${reminderType}
- Meta Status     : ${twilioStatus}
- Failure Reason  : ${failureReason || 'N/A'}
--------------------------------------------------`);
          }
        });
      } catch (gymErr) {
        console.error(`Error in runReminders for gym ${gym.gymId} (${gym.dbName}):`, gymErr);
        stats.errors.push({ client: 'N/A', reminderType: 'Gym Initialization', error: gymErr.message });
      }
    }

    console.log('--- WhatsApp Expiry Reminders Job Completed ---');
  } catch (err) {
    console.error('Error in runReminders job:', err);
    stats.errors.push({ client: 'N/A', reminderType: 'Global Execution', error: err.message });
  }

  stats.durationMs = Date.now() - startTime;
  return stats;
};

// Run every day at 11:40 PM
cron.schedule('05 0 * * *', async () => {
  console.log('Running daily automated reminderJob...');
  await runReminders();
});

module.exports = {
  runReminders
};
