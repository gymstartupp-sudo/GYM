const cron = require('node-cron');
const Client = require('../models/Client');
const Gym = require('../models/Gym');
const sendWhatsApp = require('../utils/sendWhatsApp');
const { syncClientStatus } = require('../utils/syncStatus');

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

// Reusable function to run the reminder checks
const runReminders = async () => {
  console.log('--- Starting WhatsApp Expiry Reminders Job ---');
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all active clients
    const clients = await Client.find({ isActive: true, 'membership.requestApproved': true });
    console.log(`Found ${clients.length} active clients to process.`);

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
      let twilioStatus = 'Skipped';
      let failureReason = '';

      if (daysLeft === 3) {
        reminderType = 'Expiring Soon';
        if (!cleanMobile) {
          twilioStatus = 'Failed';
          failureReason = 'Invalid/Dummy WhatsApp number';
          updatedClient.membership.expiryReminderStatus = 'failed';
          updatedClient.expiryReminderStatus = 'failed';
          updatedClient.membership.expiryReminderError = failureReason;
          updatedClient.expiryReminderError = failureReason;
          updatedClient.membership.expiryReminderSentAt = new Date();
          updatedClient.expiryReminderSentAt = new Date();
          await updatedClient.save();
        } else {
          // Check duplicate flag
          const isSent = updatedClient.membership.expiryReminderSent || updatedClient.expiryReminderSent;
          if (isSent) {
            twilioStatus = 'Skipped';
            failureReason = 'Reminder already sent today (Duplicate Prevention)';
          } else {
            // Send Expiring Soon Reminder
            const msg = `Dear ${updatedClient.personalInfo.name}, your membership plan is expiring soon. Please renew your plan. Gym Name: ${updatedClient.gymName}. Days Left: ${daysLeft}.`;

            const result = await sendWhatsApp({ phone: formattedWhatsApp, message: msg });
            if (result && result.success) {
              twilioStatus = 'Success';
              updatedClient.membership.expiryReminderSent = true;
              updatedClient.expiryReminderSent = true;
              updatedClient.membership.expiryReminderStatus = 'sent';
              updatedClient.expiryReminderStatus = 'sent';
              updatedClient.membership.expiryReminderError = null;
              updatedClient.expiryReminderError = null;
              updatedClient.membership.expiryReminderSentAt = new Date();
              updatedClient.expiryReminderSentAt = new Date();
              await updatedClient.save();
            } else {
              twilioStatus = 'Failed';
              failureReason = result ? result.error : 'Twilio send error';
              updatedClient.membership.expiryReminderStatus = 'failed';
              updatedClient.expiryReminderStatus = 'failed';
              updatedClient.membership.expiryReminderError = failureReason;
              updatedClient.expiryReminderError = failureReason;
              updatedClient.membership.expiryReminderSentAt = new Date();
              updatedClient.expiryReminderSentAt = new Date();
              await updatedClient.save();
            }
          }
        }
      } else if (daysLeft <= -1) {
        reminderType = 'Expired';
        if (!cleanMobile) {
          twilioStatus = 'Failed';
          failureReason = 'Invalid/Dummy WhatsApp number';
          updatedClient.membership.expiredReminderStatus = 'failed';
          updatedClient.expiredReminderStatus = 'failed';
          updatedClient.membership.expiredReminderError = failureReason;
          updatedClient.expiredReminderError = failureReason;
          await updatedClient.save();
        } else {
          // Check duplicate flag
          const isSent = updatedClient.membership.expiredReminderSent || updatedClient.expiredReminderSent;
          if (isSent) {
            twilioStatus = 'Skipped';
            failureReason = 'Reminder already sent today (Duplicate Prevention)';
          } else {
            // Send Expired Reminder
            const renewalLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/client/renew/${updatedClient.clientId}`;
            const msg = `Dear ${updatedClient.personalInfo.name},\n\nYour membership has expired.\n\nPlease renew your membership using the link below.\n\nRenew Membership:\n${renewalLink}\n\nRegards,\n${updatedClient.gymName}`;

            const result = await sendWhatsApp({ phone: formattedWhatsApp, message: msg });
            if (result && result.success) {
              twilioStatus = 'Success';
              updatedClient.membership.expiredReminderSent = true;
              updatedClient.expiredReminderSent = true;
              updatedClient.membership.expiredReminderStatus = 'sent';
              updatedClient.expiredReminderStatus = 'sent';
              updatedClient.membership.expiredReminderError = null;
              updatedClient.expiredReminderError = null;
              await updatedClient.save();
            } else {
              twilioStatus = 'Failed';
              failureReason = result ? result.error : 'Twilio send error';
              updatedClient.membership.expiredReminderStatus = 'failed';
              updatedClient.expiredReminderStatus = 'failed';
              updatedClient.membership.expiredReminderError = failureReason;
              updatedClient.expiredReminderError = failureReason;
              await updatedClient.save();
            }
          }
        }
      }

      // 4. Output detailed terminal logs as requested
      console.log(`[CLIENT PROCESSED]
- Client Name     : ${updatedClient.personalInfo.name}
- Client ID       : ${updatedClient.clientId}
- WhatsApp Number : ${formattedWhatsApp || 'Invalid (' + (updatedClient.personalInfo?.mobileNo || 'N/A') + ')'}
- daysLeft        : ${daysLeft}
- Reminder Type   : ${reminderType}
- Twilio Status   : ${twilioStatus}
- Failure Reason  : ${failureReason || 'N/A'}
--------------------------------------------------`);
    }

    console.log('--- WhatsApp Expiry Reminders Job Completed ---');
  } catch (err) {
    console.error('Error in runReminders job:', err);
  }
};

// Run every day at 04:15 PM
cron.schedule('30 16 * * *', async () => {
  console.log('Running daily automated reminderJob...');
  await runReminders();
});

module.exports = {
  runReminders
};
