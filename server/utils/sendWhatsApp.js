const twilio = require('twilio');

const sendWhatsApp = async (options) => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log(`[WhatsApp MOCK] To: ${options.phone}, Message: ${options.message}`);
      return;
    }
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    let formattedPhone = options.phone;
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone; 
    }

    let fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    if (!fromNumber.startsWith('whatsapp:')) {
      fromNumber = 'whatsapp:' + fromNumber;
    }

    const messageResponse = await client.messages.create({
      body: options.message,
      from: fromNumber,
      to: `whatsapp:${formattedPhone}`
    });
    console.log(`WhatsApp Sent: ${messageResponse.sid}`);
    return { success: true, sid: messageResponse.sid, status: messageResponse.status };
  } catch (error) {
    console.error('Error sending WhatsApp: ', error);
    return { success: false, error: error.message };
  }
};

module.exports = sendWhatsApp;
