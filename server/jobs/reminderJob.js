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
    const clients = await Client.find({ isActive: true });
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

      // 2. Recalculate daysLeft dynamically
      const endDate = new Date(updatedClient.membership.endDate);
      endDate.setHours(0, 0, 0, 0);
      const diffTime = endDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Update daysLeft and status in the DB
      updatedClient.membership.daysLeft = daysLeft;
      if (daysLeft <= 0) {
        updatedClient.membership.status = 'expired';
      } else if (daysLeft <= 3) {
        updatedClient.membership.status = 'expiring_soon';
      } else {
        updatedClient.membership.status = 'active';
      }

      // Flag Reset Rules:
      // If renewed, reset expiryReminderSent (daysLeft > 3)
      if (daysLeft > 3) {
        updatedClient.membership.expiryReminderSent = false;
        updatedClient.expiryReminderSent = false;
      }
      // If active again, reset expiredReminderSent (daysLeft >= 0)
      if (daysLeft >= 0) {
        updatedClient.membership.expiredReminderSent = false;
        updatedClient.expiredReminderSent = false;
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
              await updatedClient.save();
            } else {
              twilioStatus = 'Failed';
              failureReason = result ? result.error : 'Twilio send error';
            }
          }
        }
      } else if (daysLeft <= -1) {
        reminderType = 'Expired';
        if (!cleanMobile) {
          twilioStatus = 'Failed';
          failureReason = 'Invalid/Dummy WhatsApp number';
        } else {
          // Check duplicate flag
          const isSent = updatedClient.membership.expiredReminderSent || updatedClient.expiredReminderSent;
          if (isSent) {
            twilioStatus = 'Skipped';
            failureReason = 'Reminder already sent today (Duplicate Prevention)';
          } else {
            // Send Expired Reminder
            const paymentLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/pay/${updatedClient.clientId}/${updatedClient.gymId}`;
            const msg = `Dear ${updatedClient.personalInfo.name}, your membership plan has expired. Renew your membership now. Gym Name: ${updatedClient.gymName}. Payment/Renewal Link: ${paymentLink}`;

            const result = await sendWhatsApp({ phone: formattedWhatsApp, message: msg });
            if (result && result.success) {
              twilioStatus = 'Success';
              updatedClient.membership.expiredReminderSent = true;
              updatedClient.expiredReminderSent = true;
              await updatedClient.save();
            } else {
              twilioStatus = 'Failed';
              failureReason = result ? result.error : 'Twilio send error';
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

// Run every day at 03:00 AM
cron.schedule('0 3 * * *', async () => {
  console.log('Running daily automated reminderJob...');
  await runReminders();
});

module.exports = {
  runReminders
};
