const https = require('https');

/**
 * Utility function to perform a POST request using Node's native https module.
 */
const postRequest = (url, headers, body) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(body))
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(JSON.stringify(body));
    req.end();
  });
};

/**
 * Helper to extract the dynamic parameter suffix from a full URL,
 * since Meta dynamic URL buttons do not accept protocol/domain in parameters.
 */
const getButtonParam = (urlOrSuffix) => {
  if (!urlOrSuffix) return '';
  const searchStr = '/client/renew/';
  const index = urlOrSuffix.indexOf(searchStr);
  if (index !== -1) {
    return urlOrSuffix.substring(index + searchStr.length);
  }
  return urlOrSuffix;
};

/**
 * Common sender function to post template message payload to Meta Graph API.
 */
const sendMetaWhatsApp = async ({ to, templateName, components, reminderType, clientId, gymId }) => {
  const token = process.env.META_ACCESS_TOKEN;
  const phoneId = process.env.META_PHONE_NUMBER_ID;

  // Run in mock mode if environment variables are not configured
  if (!token || !phoneId) {
    const mockId = `wamid.MOCK_${Math.random().toString(36).substring(2, 15)}`;
    const mockSentTime = new Date().toISOString();
    console.log(`[META WHATSAPP MOCK]
- Reminder Type : ${reminderType}
- Client ID     : ${clientId || 'N/A'}
- Gym ID        : ${gymId || 'N/A'}
- Message ID    : ${mockId}
- Sent Time     : ${mockSentTime}
- Status        : MockSent
- Details       : To: ${to}, Template: ${templateName}, Components: ${JSON.stringify(components)}`);
    return { success: true, messageId: mockId, status: 'sent' };
  }

  // Format recipient number (strip "+", prepend "91" if 10 digits)
  let cleanPhone = to.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }

  const graphVersion = process.env.META_GRAPH_VERSION;

  const url = `https://graph.facebook.com/${graphVersion}/${phoneId}/messages`;
  const headers = {
    'Authorization': `Bearer ${token}`
  };

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: process.env.META_LANGUAGE_CODE || 'en'
      },
      components: components
    }
  };

  try {
    const response = await postRequest(url, headers, body);
    const resBody = JSON.parse(response.body);

    if (response.statusCode >= 200 && response.statusCode < 300 && resBody.messages && resBody.messages[0]) {
      const messageId = resBody.messages[0].id;
      const sentTime = new Date().toISOString();
      console.log(`[META WHATSAPP SUCCESS]
- Reminder Type : ${reminderType}
- Client ID     : ${clientId || 'N/A'}
- Gym ID        : ${gymId || 'N/A'}
- Message ID    : ${messageId}
- Sent Time     : ${sentTime}
- Status        : Sent`);
      return { success: true, messageId, status: 'sent' };
    } else {
      const errMessage = resBody.error?.message || response.body || 'Unknown Meta API error';
      console.error(`[META WHATSAPP FAILURE]
- Reminder Type : ${reminderType}
- Client ID     : ${clientId || 'N/A'}
- Gym ID        : ${gymId || 'N/A'}
- Sent Time     : ${new Date().toISOString()}
- Error         : ${errMessage}`);
      return { success: false, error: errMessage };
    }
  } catch (err) {
    console.error(`[META WHATSAPP FAILURE]
- Reminder Type : ${reminderType}
- Client ID     : ${clientId || 'N/A'}
- Gym ID        : ${gymId || 'N/A'}
- Sent Time     : ${new Date().toISOString()}
- Error         : ${err.message}`);
    return { success: false, error: err.message };
  }
};

/**
 * 1. Expiring Soon Reminder
 * Variables: Client Name, Gym Name, Expiry Date, Days Left
 */
const sendExpiringSoonReminder = async ({ phone, clientName, gymName, expiryDate, daysLeft, clientId, gymId }) => {
  const templateName = process.env.META_TEMPLATE_EXPIRING_SOON || 'membership_expiring_soon';

  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(clientName) },
        { type: 'text', text: String(gymName) },
        { type: 'text', text: String(expiryDate) },
        { type: 'text', text: String(daysLeft) }
      ]
    }
  ];

  return sendMetaWhatsApp({
    to: phone,
    templateName,
    components,
    reminderType: 'Expiring Soon',
    clientId,
    gymId
  });
};

/**
 * 2. Expired Reminder
 * Variables: Client Name, Gym Name, Expiry Date, Renewal Link
 */
const sendExpiredReminder = async ({ phone, clientName, gymName, expiryDate, renewalLink, clientId, gymId }) => {
  const templateName = process.env.META_TEMPLATE_EXPIRED || 'membership_expired';
  const isDynamic = process.env.META_EXPIRED_LINK_AS_BUTTON_DYNAMIC === 'true';

  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(clientName) },
        { type: 'text', text: String(gymName) },
        { type: 'text', text: String(expiryDate) }
      ]
    }
  ];

  if (isDynamic) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [
        { type: 'text', text: getButtonParam(renewalLink) }
      ]
    });
  }

  return sendMetaWhatsApp({
    to: phone,
    templateName,
    components,
    reminderType: 'Expired',
    clientId,
    gymId
  });
};

/**
 * 2a. Expiring Soon Pending Reminder
 * Variables: Client Name, Gym Name, Expiry Date, Days Left, Pending Amount
 */
const sendExpiringSoonPendingReminder = async ({ phone, clientName, gymName, expiryDate, daysLeft, pendingAmount, clientId, gymId }) => {
  const templateName = process.env.META_TEMPLATE_EXPIRING_SOON_PENDING || 'membership_expiring_soon_pending';

  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(clientName) },
        { type: 'text', text: String(gymName) },
        { type: 'text', text: String(expiryDate) },
        { type: 'text', text: String(daysLeft) },
        { type: 'text', text: String(pendingAmount) }
      ]
    }
  ];

  return sendMetaWhatsApp({
    to: phone,
    templateName,
    components,
    reminderType: 'Expiring Soon Pending',
    clientId,
    gymId
  });
};

/**
 * 2b. Expired Pending Reminder
 * Variables: Client Name, Gym Name, Expiry Date, Pending Amount, Renewal Link
 */
const sendExpiredPendingReminder = async ({ phone, clientName, gymName, expiryDate, pendingAmount, renewalLink, clientId, gymId }) => {
  const templateName = process.env.META_TEMPLATE_EXPIRED_PENDING || 'membership_expired_pending';
  const isDynamic = process.env.META_EXPIRED_PENDING_LINK_AS_BUTTON_DYNAMIC === 'true';

  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(clientName) },
        { type: 'text', text: String(gymName) },
        { type: 'text', text: String(expiryDate) },
        { type: 'text', text: String(pendingAmount) }
      ]
    }
  ];

  if (isDynamic) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [
        { type: 'text', text: getButtonParam(renewalLink) }
      ]
    });
  }

  return sendMetaWhatsApp({
    to: phone,
    templateName,
    components,
    reminderType: 'Expired Pending',
    clientId,
    gymId
  });
};

/**
 * Helper to build components for due templates (which all have the same body/button variables: Client Name, Pending Amount, Due Date, Renewal Link)
 */
const buildDueComponents = (clientName, pendingAmount, dueDate, renewalLink, stage) => {
  const isButton = process.env.META_DUE_LINK_AS_BUTTON === 'true';
  if (stage === 1 || stage === 2) {
    if (isButton) {
      return [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: String(clientName) },
            { type: 'text', text: String(pendingAmount) },
            { type: 'text', text: String(dueDate) }
          ]
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [
            { type: 'text', text: getButtonParam(renewalLink) }
          ]
        }
      ];
    } else {
      return [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: String(clientName) },
            { type: 'text', text: String(pendingAmount) },
            { type: 'text', text: String(dueDate) }
          ]
        }
      ];
    }
  } else {
    // Stage 3 (due_third_reminder) expects exactly 2 parameters (Client Name, Pending Amount)
    return [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: String(clientName) },
          { type: 'text', text: String(pendingAmount) }
        ]
      }
    ];
  }
};

/**
 * 3a. Due First Reminder (3 days before due date)
 */
const sendDueFirstReminder = async ({ phone, clientName, pendingAmount, dueDate, renewalLink, clientId, gymId }) => {
  const templateName = process.env.META_TEMPLATE_DUE_FIRST || 'due_first_reminder';
  const components = buildDueComponents(clientName, pendingAmount, dueDate, renewalLink, 1);
  return sendMetaWhatsApp({
    to: phone,
    templateName,
    components,
    reminderType: 'Due First Reminder',
    clientId,
    gymId
  });
};

/**
 * 3b. Due Second Reminder (On due date)
 */
const sendDueSecondReminder = async ({ phone, clientName, pendingAmount, dueDate, renewalLink, clientId, gymId }) => {
  const templateName = process.env.META_TEMPLATE_DUE_SECOND || 'due_second_reminder';
  const components = buildDueComponents(clientName, pendingAmount, dueDate, renewalLink, 2);
  return sendMetaWhatsApp({
    to: phone,
    templateName,
    components,
    reminderType: 'Due Second Reminder',
    clientId,
    gymId
  });
};

/**
 * 3c. Due Third Reminder (3 days after due date)
 */
const sendDueThirdReminder = async ({ phone, clientName, pendingAmount, dueDate, renewalLink, clientId, gymId }) => {
  const templateName = process.env.META_TEMPLATE_DUE_THIRD || 'due_third_reminder';
  const components = buildDueComponents(clientName, pendingAmount, dueDate, renewalLink, 3);
  return sendMetaWhatsApp({
    to: phone,
    templateName,
    components,
    reminderType: 'Due Third Reminder',
    clientId,
    gymId
  });
};

/**
 * Unified Due Reminder wrapper that selects template based on reminder stage
 */
const sendDueReminder = async ({ phone, clientName, pendingAmount, dueDate, renewalLink, clientId, gymId, stage = 3 }) => {
  if (stage === 1) {
    return sendDueFirstReminder({ phone, clientName, pendingAmount, dueDate, renewalLink, clientId, gymId });
  } else if (stage === 2) {
    return sendDueSecondReminder({ phone, clientName, pendingAmount, dueDate, renewalLink, clientId, gymId });
  } else {
    return sendDueThirdReminder({ phone, clientName, pendingAmount, dueDate, renewalLink, clientId, gymId });
  }
};

const sendPaymentReceived = async ({ phone, clientName, gymName, amount, pdfUrl, paymentId, clientId, gymId }) => {
  const templateName = process.env.META_TEMPLATE_PAYMENT_RECEIVED || 'payment_received';

  const components = [
    {
      type: 'header',
      parameters: [
        {
          type: 'document',
          document: {
            link: pdfUrl,
            filename: `${paymentId || 'receipt'}.pdf`
          }
        }
      ]
    },
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(clientName) },
        { type: 'text', text: String(gymName) },
        { type: 'text', text: String(amount) }
      ]
    }
  ];

  return sendMetaWhatsApp({
    to: phone,
    templateName,
    components,
    reminderType: 'Payment Received',
    clientId,
    gymId
  });
}; const sendPaymentReceivedTemplate = async ({ phone, clientName, gymName, amount, pdfUrl, paymentId, clientId, gymId }) => {
  const templateName = process.env.META_TEMPLATE_PAYMENT_RECEIVED || 'payment_received';

  const components = [
    {
      type: 'header',
      parameters: [
        {
          type: 'document',
          document: {
            link: pdfUrl,
            filename: `${paymentId || 'receipt'}.pdf`
          }
        }
      ]
    },
    {
      type: 'body',
      parameters: [
        { type: 'text', parameter_name: 'customer_name', text: String(clientName) },
        { type: 'text', parameter_name: 'gym_name', text: String(gymName) },
        { type: 'text', parameter_name: 'amount', text: String(amount) }
      ]
    }
  ];

  return sendMetaWhatsApp({
    to: phone,
    templateName,
    components,
    reminderType: 'Payment Received Template',
    clientId,
    gymId
  });
};
const sendWhatsAppDocument = async ({ phone, pdfUrl, filename, caption, clientId, gymId }) => {
  const token = process.env.META_ACCESS_TOKEN;
  const phoneId = process.env.META_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    const mockId = `wamid.MOCK_DOC_${Math.random().toString(36).substring(2, 15)}`;
    const mockSentTime = new Date().toISOString();
    console.log(`[META DOCUMENT MOCK]
- File Name     : ${filename}
- Client ID     : ${clientId || 'N/A'}
- Gym ID        : ${gymId || 'N/A'}
- Message ID    : ${mockId}
- Sent Time     : ${mockSentTime}
- Status        : MockSent
- Details       : To: ${phone}, URL: ${pdfUrl}, Caption: ${caption}`);
    return { success: true, messageId: mockId, status: 'sent' };
  }

  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }

  const graphVersion = process.env.META_GRAPH_VERSION || 'v20.0';
  const url = `https://graph.facebook.com/${graphVersion}/${phoneId}/messages`;
  const headers = { 'Authorization': `Bearer ${token}` };

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type: 'document',
    document: {
      link: pdfUrl,
      filename: filename,
      caption: caption
    }
  };

  try {
    const response = await postRequest(url, headers, body);
    const resBody = JSON.parse(response.body);

    if (response.statusCode >= 200 && response.statusCode < 300 && resBody.messages && resBody.messages[0]) {
      const messageId = resBody.messages[0].id;
      const sentTime = new Date().toISOString();
      console.log(`[META DOCUMENT SUCCESS]
- File Name     : ${filename}
- Client ID     : ${clientId || 'N/A'}
- Gym ID        : ${gymId || 'N/A'}
- Message ID    : ${messageId}
- Sent Time     : ${sentTime}
- Status        : Sent`);
      return { success: true, messageId, status: 'sent' };
    } else {
      const errMessage = resBody.error?.message || response.body || 'Unknown Meta API error';
      console.error(`[META DOCUMENT FAILURE]
- File Name     : ${filename}
- Client ID     : ${clientId || 'N/A'}
- Gym ID        : ${gymId || 'N/A'}
- Sent Time     : ${new Date().toISOString()}
- Error         : ${errMessage}`);
      return { success: false, error: errMessage };
    }
  } catch (err) {
    console.error(`[META DOCUMENT FAILURE]
- File Name     : ${filename}
- Client ID     : ${clientId || 'N/A'}
- Gym ID        : ${gymId || 'N/A'}
- Sent Time     : ${new Date().toISOString()}
- Error         : ${err.message}`);
    return { success: false, error: err.message };
  }
};

/**
 * 12. Forgot Password OTP
 * Variables: OTP Code
 */
const sendForgotPasswordOTP = async ({ phone, otp, clientId, gymId }) => {
  const templateName = 'forgot_psd_otp';

  // Standard Meta Authentication templates have:
  // - Body component with 1 parameter (the OTP code)
  // - Button component (sub_type: 'url') with 1 parameter (the OTP code) for the copy/autofill button.
  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(otp) }
      ]
    },
    {
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [
        { type: 'text', text: String(otp) }
      ]
    }
  ];

  return sendMetaWhatsApp({
    to: phone,
    templateName,
    components,
    reminderType: 'Forgot Password OTP',
    clientId,
    gymId
  });
};

module.exports = {
  sendExpiringSoonReminder,
  sendExpiringSoonPendingReminder,
  sendExpiredReminder,
  sendExpiredPendingReminder,
  sendDueFirstReminder,
  sendDueSecondReminder,
  sendDueThirdReminder,
  sendDueReminder,
  sendPaymentReceived,
  sendPaymentReceivedTemplate,
  sendWhatsAppDocument,
  sendForgotPasswordOTP
};
