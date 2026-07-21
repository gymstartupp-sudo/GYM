const cron = require('node-cron');
const Client = require('../models/Client');
const Gym = require('../models/Gym');
const metaWhatsAppService = require('../services/metaWhatsAppService');
const { syncClientStatus } = require('../utils/syncStatus');
const { getTenantConnection } = require('../utils/connectionManager');
const { runWithTenantContext } = require('../utils/tenantContext');

// Reusable function to run the overdue reminder checks
const runOverdueReminders = async (options = {}) => {
  console.log('--- Starting WhatsApp Overdue Reminders Job ---');
  const startTime = Date.now();
  const stats = {
    executionTime: new Date().toISOString(),
    cronName: 'Payment Overdue Reminders',
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

          // Fetch active partial/overdue clients, potentially filtering by clientId
          const query = {
            isActive: true,
            'membership.requestApproved': true,
            paymentStatus: { $in: ['partial', 'overdue'] }
          };
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
          console.log(`[Gym: ${gym.gymId}] Found ${clients.length} partial/overdue clients to process.`);

          for (let client of clients) {
            // Skip if workflow is completed or if they are paid
            if (client.overdueReminders?.workflowCompleted) {
              stats.skippedClients++;
              continue;
            }

            // Sync latest status to ensure up-to-date memberships and totalPaid
            await syncClientStatus(client._id);
            const updatedClient = await Client.findById(client._id);

            if (!updatedClient || updatedClient.overdueReminders?.workflowCompleted) {
              stats.skippedClients++;
              continue;
            }

            // Find the membership with remaining balance
            const m = [...(updatedClient.memberships || [])]
              .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
              .find(mem => {
                const finalPrice = mem.finalPrice || 0;
                const totalPaid = mem.totalPaid || 0;
                return (finalPrice - totalPaid) > 0;
              });

            if (!m || !m.dueDate) {
              stats.skippedClients++;
              continue;
            }

            const balance = (m.finalPrice || 0) - (m.totalPaid || 0);
            if (balance <= 0) {
              // If balance is 0, mark workflowCompleted
              if (!updatedClient.overdueReminders) {
                updatedClient.overdueReminders = {};
              }
              updatedClient.overdueReminders.workflowCompleted = true;
              await updatedClient.save();
              stats.skippedClients++;
              continue;
            }

            // Calculate daysUntilDue
            const normalizeDate = (d) => {
              const nd = new Date(d);
              nd.setHours(0, 0, 0, 0);
              return nd;
            };

            const normalizedToday = normalizeDate(today);
            const normalizedDueDate = normalizeDate(m.dueDate);
            const diffTime = normalizedDueDate.getTime() - normalizedToday.getTime();
            const daysUntilDue = Math.round(diffTime / (1000 * 60 * 60 * 24));

            // Check WhatsApp number
            const getValidWhatsAppNumber = (c) => {
              const rawNum = c.personalInfo?.whatsappNumber || c.whatsappNumber || c.personalInfo?.mobileNo || c.personalInfo?.mobile;
              if (!rawNum) return null;
              let cleaned = String(rawNum).replace(/\D/g, '');
              if (cleaned.startsWith('91') && cleaned.length === 12) {
                cleaned = cleaned.substring(2);
              }
              const indianMobileRegex = /^[6-9]\d{9}$/;
              return indianMobileRegex.test(cleaned) ? cleaned : null;
            };

            const cleanMobile = getValidWhatsAppNumber(updatedClient);
            const formattedWhatsApp = cleanMobile ? `+91${cleanMobile}` : null;

            let reminderToTrigger = null;
            let reminderKey = '';
            let clientTwilioStatus = 'Skipped';
            let clientFailureReason = '';

            const isNotSent = (rem) => !rem?.status || rem.status === 'none' || rem.status === 'failed';

            if (daysUntilDue <= 3 && daysUntilDue > 0 && isNotSent(updatedClient.overdueReminders?.reminder1)) {
              reminderToTrigger = 1;
              reminderKey = 'reminder1';
            } else if (daysUntilDue <= 0 && daysUntilDue > -3 && isNotSent(updatedClient.overdueReminders?.reminder2)) {
              reminderToTrigger = 2;
              reminderKey = 'reminder2';
            } else if (daysUntilDue <= -3 && isNotSent(updatedClient.overdueReminders?.reminder3)) {
              reminderToTrigger = 3;
              reminderKey = 'reminder3';
            }

            if (reminderToTrigger) {
              stats.processedClients++;
              let twilioStatus = 'Skipped';
              let failureReason = '';
              const remTypeMap = { 1: 'Due Reminder 1', 2: 'Due Reminder 2', 3: 'Due Reminder 3' };
              const tempNameMap = {
                1: process.env.META_TEMPLATE_DUE_FIRST || 'due_first_reminder',
                2: process.env.META_TEMPLATE_DUE_SECOND || 'due_second_reminder',
                3: process.env.META_TEMPLATE_DUE_THIRD || 'due_third_reminder'
              };
              const reminderType = remTypeMap[reminderToTrigger];
              const templateName = tempNameMap[reminderToTrigger];

              const dueDateString = new Date(m.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-');

              if (!updatedClient.overdueReminders) {
                updatedClient.overdueReminders = {
                  reminder1: { status: 'none', sentAt: null, error: null },
                  reminder2: { status: 'none', sentAt: null, error: null },
                  reminder3: { status: 'none', sentAt: null, error: null },
                  manualReminders: [],
                  workflowCompleted: false
                };
              }

              if (!cleanMobile) {
                twilioStatus = 'failed';
                failureReason = 'Invalid/Dummy WhatsApp number';
                updatedClient.overdueReminders[reminderKey] = {
                  status: 'failed',
                  sentAt: new Date(),
                  error: failureReason
                };

                // Log failed history
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
                const paymentLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/client/renew/${updatedClient.clientId}?balance=true`;
                const result = await metaWhatsAppService.sendDueReminder({
                  phone: formattedWhatsApp,
                  clientName: updatedClient.personalInfo.name,
                  pendingAmount: balance,
                  dueDate: dueDateString,
                  renewalLink: paymentLink,
                  clientId: updatedClient.clientId,
                  gymId: gym.gymId,
                  stage: reminderToTrigger
                });
                if (result && result.success) {
                  twilioStatus = 'sent';
                  updatedClient.overdueReminders[reminderKey] = {
                    status: 'sent',
                    sentAt: new Date(),
                    error: null
                  };

                  // Log success history
                  updatedClient.overdueReminders.manualReminders.push({
                    sentAt: new Date(),
                    status: 'sent',
                    error: null,
                    reminderType,
                    templateName,
                    executionSource: options.executionSource || 'Automatic Cron',
                    messageId: result.messageId
                  });

                  await updatedClient.save();
                  stats.successfulMessages++;
                } else {
                  twilioStatus = 'failed';
                  failureReason = result ? result.error : 'Meta send error';
                  updatedClient.overdueReminders[reminderKey] = {
                    status: 'failed',
                    sentAt: new Date(),
                    error: failureReason
                  };

                  // Log failed history
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

              // Store status to print outside
              clientTwilioStatus = twilioStatus;
              clientFailureReason = failureReason;
            } else {
              stats.skippedClients++;
            }

            console.log(`[OVERDUE CLIENT PROCESSED]
- Client Name     : ${updatedClient.personalInfo.name}
- Client ID       : ${updatedClient.clientId}
- Days Until Due  : ${daysUntilDue}
- Reminder Sent   : ${reminderKey || 'None'}
- Status          : ${clientTwilioStatus}
- Error           : ${clientFailureReason || 'N/A'}`);
          }
        });
      } catch (gymErr) {
        console.error(`Error in runOverdueReminders for gym ${gym.gymId} (${gym.dbName}):`, gymErr);
        stats.errors.push({ client: 'N/A', reminderType: 'Gym Initialization', error: gymErr.message });
      }
    }
    console.log('--- WhatsApp Overdue Reminders Job Completed ---');
  } catch (err) {
    console.error('Error in runOverdueReminders job:', err);
    stats.errors.push({ client: 'N/A', reminderType: 'Global Execution', error: err.message });
  }

  stats.durationMs = Date.now() - startTime;
  return stats;
};

// Run every day at 04:30 PM
cron.schedule('46 01 * * *', async () => {
  console.log('Running daily automated overdueReminderJob...');
  await runOverdueReminders();
});

module.exports = {
  runOverdueReminders
};
