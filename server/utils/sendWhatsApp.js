const metaWhatsAppService = require('../services/metaWhatsAppService');

/**
 * Fallback wrapper for sendWhatsApp that parses legacy freeform message strings
 * and routes them to the appropriate Meta WhatsApp template service method.
 */
const sendWhatsApp = async (options) => {
  const { phone, message } = options;
  if (!phone) {
    return { success: false, error: 'No phone number provided' };
  }
  if (!message) {
    return { success: false, error: 'No message content provided' };
  }

  try {
    const msgStr = String(message).trim();

    // 1. Detect Expiring Soon Reminder
    // Pattern A: "your membership plan is expiring soon. Please renew your plan. Gym Name: <Gym>. Days Left: <Days>."
    // Pattern B: "Your membership will expire in 3 days... Gym: <Gym>"
    if (msgStr.toLowerCase().includes('expiring soon') || msgStr.toLowerCase().includes('expire in 3 days')) {
      let clientName = 'Client';
      let gymName = 'Your Gym';
      let daysLeft = '3';
      let expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 3);
      const formattedExpiry = expiryDate.toLocaleDateString('en-GB').replace(/\//g, '-');

      // Attempt parsing Pattern A
      const matchA = msgStr.match(/Dear\s+(.+?),\s*your\s+membership\s+plan\s+is\s+expiring\s+soon.*?Gym\s+Name:\s*(.+?)\.\s*Days\s+Left:\s*(\d+)/i);
      if (matchA) {
        clientName = matchA[1].trim();
        gymName = matchA[2].trim();
        daysLeft = matchA[3].trim();
      } else {
        // Attempt parsing Pattern B
        const matchB = msgStr.match(/Hello\s+(.+?),\s*Your\s+membership\s+will\s+expire\s+in\s+3\s+days.*?Gym:\s*(.+)/is);
        if (matchB) {
          clientName = matchB[1].trim();
          gymName = matchB[2].trim();
        }
      }

      const result = await metaWhatsAppService.sendExpiringSoonReminder({
        phone,
        clientName,
        gymName,
        expiryDate: formattedExpiry,
        daysLeft
      });
      return { success: result.success, sid: result.messageId, status: result.status, error: result.error };
    }

    // 2. Detect Expired Reminder
    // Pattern A: "Your membership has expired... Renew Membership:\n<Link>\n\nRegards,\n<Gym>"
    // Pattern B: "Your membership has expired... Pay Pending Balance: <Link>\nGym: <Gym>"
    if (msgStr.toLowerCase().includes('has expired')) {
      let clientName = 'Client';
      let gymName = 'Your Gym';
      let expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() - 1);
      const formattedExpiry = expiryDate.toLocaleDateString('en-GB').replace(/\//g, '-');
      let renewalLink = '';

      // Attempt parsing Pattern A (no balance)
      const matchA = msgStr.match(/Dear\s+(.+?),\s*Your\s+membership\s+has\s+expired.*?Renew\s+Membership:\s*(https?:\/\/\S+).*?Regards,\s*(.+)/is);
      if (matchA) {
        clientName = matchA[1].trim();
        renewalLink = matchA[2].trim();
        gymName = matchA[3].trim();
      } else {
        // Attempt parsing Pattern B (has balance)
        const matchB = msgStr.match(/Hello\s+(.+?),\s*Your\s+membership\s+has\s+expired.*?Pay\s+Pending\s+Balance:\s*(https?:\/\/\S+).*?Gym:\s*(.+)/is);
        if (matchB) {
          clientName = matchB[1].trim();
          renewalLink = matchB[2].trim();
          gymName = matchB[3].trim();
        }
      }

      const result = await metaWhatsAppService.sendExpiredReminder({
        phone,
        clientName,
        gymName,
        expiryDate: formattedExpiry,
        renewalLink
      });
      return { success: result.success, sid: result.messageId, status: result.status, error: result.error };
    }

    // 3. Detect Due / Overdue Reminder
    // Pattern A (Reminder 1): "pending membership balance of ₹<Amount> is due on <Date>... Plan: <Plan>\nGym: <Gym>"
    // Pattern B (Reminder 2): "pending membership balance of ₹<Amount> is due today... Plan: <Plan>\nGym: <Gym>"
    // Pattern C (Reminder 3): "pending membership balance of ₹<Amount> is overdue (Due Date: <Date>)... Pay Pending Balance: <Link>"
    if (msgStr.toLowerCase().includes('pending membership balance') || msgStr.toLowerCase().includes('due today') || msgStr.toLowerCase().includes('overdue')) {
      let clientName = 'Client';
      let pendingAmount = '0';
      let dueDate = '';
      let renewalLink = '';
      let gymName = 'Your Gym';
      let stage = 3;

      // Pattern A
      const matchA = msgStr.match(/Dear\s+(.+?),\s*This\s+is\s+a\s+friendly\s+reminder\s+that\s+your\s+pending\s+membership\s+balance\s+of\s+₹?(\d+(?:\.\d+)?)\s+is\s+due\s+on\s+(.+?)\..*?Plan:\s*(.+?)\nGym:\s*(.+)/is);
      // Pattern B
      const matchB = msgStr.match(/Dear\s+(.+?),\s*Your\s+pending\s+membership\s+balance\s+of\s+₹?(\d+(?:\.\d+)?)\s+is\s+due\s+today\..*?Plan:\s*(.+?)\nGym:\s*(.+)/is);
      // Pattern C
      const matchC = msgStr.match(/Dear\s+(.+?),\s*Your\s+pending\s+membership\s+balance\s+of\s+₹?(\d+(?:\.\d+)?)\s+is\s+overdue\s+\(Due\s+Date:\s*(.+?)\)\..*?Pay\s+Pending\s+Balance:\s*(https?:\/\/\S+)/is);

      if (matchA) {
        clientName = matchA[1].trim();
        pendingAmount = matchA[2].trim();
        dueDate = matchA[3].trim();
        gymName = matchA[5].trim();
        renewalLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/client/renew`;
        stage = 1;
      } else if (matchB) {
        clientName = matchB[1].trim();
        pendingAmount = matchB[2].trim();
        dueDate = 'Today';
        gymName = matchB[4].trim();
        renewalLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/client/renew`;
        stage = 2;
      } else if (matchC) {
        clientName = matchC[1].trim();
        pendingAmount = matchC[2].trim();
        dueDate = matchC[3].trim();
        renewalLink = matchC[4].trim();
        stage = 3;
      }

      const result = await metaWhatsAppService.sendDueReminder({
        phone,
        clientName,
        pendingAmount,
        dueDate,
        renewalLink,
        stage
      });
      return { success: result.success, sid: result.messageId, status: result.status, error: result.error };
    }

    // Default Fallback: If no patterns match, send a basic due reminder (stage 3)
    const result = await metaWhatsAppService.sendDueReminder({
      phone,
      clientName: msgStr.substring(0, 100),
      pendingAmount: '0',
      dueDate: 'N/A',
      renewalLink: `${process.env.CLIENT_URL || 'http://localhost:3000'}/client/renew`,
      stage: 3
    });
    return { success: result.success, sid: result.messageId, status: result.status, error: result.error };

  } catch (err) {
    console.error('Error in sendWhatsApp fallback wrapper: ', err);
    return { success: false, error: err.message };
  }
};

module.exports = sendWhatsApp;
