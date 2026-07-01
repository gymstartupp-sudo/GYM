const cron = require('node-cron');
const Client = require('../models/Client');
const Gym = require('../models/Gym');
const sendWhatsApp = require('../utils/sendWhatsApp');
const { syncClientStatus } = require('../utils/syncStatus');

// Reusable function to run the overdue reminder checks
const runOverdueReminders = async () => {
  console.log('--- Starting WhatsApp Overdue Reminders Job ---');
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all active clients who have partial or overdue paymentStatus
    const clients = await Client.find({
      isActive: true,
      'membership.requestApproved': true,
      paymentStatus: { $in: ['partial', 'overdue'] }
    });

    console.log(`Found ${clients.length} partial/overdue clients to process.`);

    for (let client of clients) {
      // Skip if workflow is completed or if they are paid
      if (client.overdueReminders?.workflowCompleted) {
        continue;
      }

      // Sync latest status to ensure up-to-date memberships and totalPaid
      await syncClientStatus(client._id);
      const updatedClient = await Client.findById(client._id);

      if (!updatedClient || updatedClient.overdueReminders?.workflowCompleted) {
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

      if (daysUntilDue <= 3 && daysUntilDue > 0 && (!updatedClient.overdueReminders?.reminder1?.status || updatedClient.overdueReminders.reminder1.status === 'none')) {
        reminderToTrigger = 1;
        reminderKey = 'reminder1';
      } else if (daysUntilDue <= 0 && daysUntilDue > -3 && (!updatedClient.overdueReminders?.reminder2?.status || updatedClient.overdueReminders.reminder2.status === 'none')) {
        reminderToTrigger = 2;
        reminderKey = 'reminder2';
      } else if (daysUntilDue <= -3 && (!updatedClient.overdueReminders?.reminder3?.status || updatedClient.overdueReminders.reminder3.status === 'none')) {
        reminderToTrigger = 3;
        reminderKey = 'reminder3';
      }

      if (reminderToTrigger) {
        let twilioStatus = 'Skipped';
        let failureReason = '';

        const dueDateString = new Date(m.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-');

        let msg = '';
        if (reminderToTrigger === 1) {
          msg = `Dear ${updatedClient.personalInfo.name},\n\nThis is a friendly reminder that your pending membership balance of ₹${balance} is due on ${dueDateString}.\n\nPlan: ${m.planName}\nGym: ${updatedClient.gymName}\n\nPlease clear the dues on or before the due date.`;
        } else if (reminderToTrigger === 2) {
          msg = `Dear ${updatedClient.personalInfo.name},\n\nYour pending membership balance of ₹${balance} is due today.\n\nPlan: ${m.planName}\nGym: ${updatedClient.gymName}\n\nPlease clear the payment today.`;
        } else if (reminderToTrigger === 3) {
          const paymentLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/client/renew/${updatedClient.clientId}?balance=true`;
          msg = `Dear ${updatedClient.personalInfo.name},\n\nYour pending membership balance of ₹${balance} is overdue (Due Date: ${dueDateString}).\n\nPlan: ${m.planName}\nGym: ${updatedClient.gymName}\n\nPlease clear the dues immediately.\nPay Pending Balance: ${paymentLink}`;
        }

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
          await updatedClient.save();
        } else {
          const result = await sendWhatsApp({ phone: formattedWhatsApp, message: msg });
          if (result && result.success) {
            twilioStatus = 'sent';
            updatedClient.overdueReminders[reminderKey] = {
              status: 'sent',
              sentAt: new Date(),
              error: null
            };
            await updatedClient.save();
          } else {
            twilioStatus = 'failed';
            failureReason = result ? result.error : 'Twilio send error';
            updatedClient.overdueReminders[reminderKey] = {
              status: 'failed',
              sentAt: new Date(),
              error: failureReason
            };
            await updatedClient.save();
          }
        }

        // Store status to print outside
        clientTwilioStatus = twilioStatus;
        clientFailureReason = failureReason;
      }

      console.log(`[OVERDUE CLIENT PROCESSED]
- Client Name     : ${updatedClient.personalInfo.name}
- Client ID       : ${updatedClient.clientId}
- Days Until Due  : ${daysUntilDue}
- Reminder Sent   : ${reminderKey || 'None'}
- Status          : ${clientTwilioStatus}
- Error           : ${clientFailureReason || 'N/A'}`);

    }
    console.log('--- WhatsApp Overdue Reminders Job Completed ---');
  } catch (err) {
    console.error('Error in runOverdueReminders job:', err);
  }
};

// Run every day at 04:30 PM
cron.schedule('41 14 * * *', async () => {
  console.log('Running daily automated overdueReminderJob...');
  await runOverdueReminders();
});

module.exports = {
  runOverdueReminders
};
