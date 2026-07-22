const { getTenantConnection } = require('../utils/connectionManager');
const { runWithTenantContext } = require('../utils/tenantContext');
const mongoose = require('mongoose');
const fs = require('fs');

const { generatePaymentPDF } = require('./pdfService');
const { uploadPDFToCloudinary } = require('../utils/cloudinary');
const metaWhatsAppService = require('./metaWhatsAppService');

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

/**
 * Orchestrator to generate PDF bill, upload to Cloudinary, and send via Meta WhatsApp.
 * Designed to run in the background without blocking API calls.
 */
const sendPaymentNotification = async (paymentId, clientId, gymId, dbName) => {
  try {
    console.log(`[WHATSAPP NOTIFICATION] Starting workflow for Payment ID: ${paymentId}`);

    // 1. Resolve tenant connections and model definitions
    const conn = await getTenantConnection(dbName);
    const PaymentModel = conn.models.Payment || conn.model('Payment', require('../models/Payment').schema);
    const ClientModel = conn.models.Client || conn.model('Client', require('../models/Client').schema);
    const GymModel = mongoose.models.Gym || mongoose.model('Gym', require('../models/Gym').schema);

    // 2. Fetch required models under tenant context
    let payment, client, gym;
    await runWithTenantContext({ tenantDb: conn, models: { Payment: PaymentModel, Client: ClientModel } }, async () => {
      payment = await PaymentModel.findById(paymentId);
      if (payment) {
        client = await ClientModel.findById(payment.clientId);
      }
      gym = await GymModel.findOne({ gymId });
    });

    if (!payment) {
      console.error(`[WHATSAPP NOTIFICATION ERROR] Payment ${paymentId} not found in database.`);
      return;
    }
    if (!client) {
      console.error(`[WHATSAPP NOTIFICATION ERROR] Client associated with payment ${paymentId} not found.`);
      return;
    }
    if (!gym) {
      console.error(`[WHATSAPP NOTIFICATION ERROR] Gym ${gymId} not found.`);
      return;
    }

    // 3. Resolve phone number
    const cleanMobile = getValidWhatsAppNumber(client);
    if (!cleanMobile) {
      console.error(`[WHATSAPP NOTIFICATION ERROR] Client has no valid WhatsApp number. Skipping.`);
      return;
    }
    const formattedWhatsApp = `+91${cleanMobile}`;

    // 4. Generate PDF Bill
    let pdfLocalPath;
    try {
      pdfLocalPath = await generatePaymentPDF(payment, client, gym);
      console.log(`[WHATSAPP NOTIFICATION] PDF Bill generated at: ${pdfLocalPath}`);
    } catch (pdfErr) {
      console.error(`[WHATSAPP NOTIFICATION ERROR] Failed to generate PDF: ${pdfErr.message}`);
      return;
    }

    // 5. Upload PDF to Cloudinary
    let pdfUrl = '';
    const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                                   !process.env.CLOUDINARY_CLOUD_NAME.includes('your_cloud_name') &&
                                   process.env.CLOUDINARY_API_KEY && 
                                   !process.env.CLOUDINARY_API_KEY.includes('your_api_key');

    if (isCloudinaryConfigured) {
      try {
        pdfUrl = await uploadPDFToCloudinary(pdfLocalPath);
        console.log(`[WHATSAPP NOTIFICATION] PDF Bill uploaded to Cloudinary: ${pdfUrl}`);
      } catch (uploadErr) {
        console.error(`[WHATSAPP NOTIFICATION ERROR] Failed to upload PDF to Cloudinary: ${uploadErr.message}`);
        // Cleanup local file on error
        if (fs.existsSync(pdfLocalPath)) {
          fs.unlinkSync(pdfLocalPath);
        }
      }
    } else {
      console.warn(`[WHATSAPP NOTIFICATION WARNING] Cloudinary credentials are not configured or are placeholders. Using sample PDF fallback.`);
      // Delete temporary file to avoid leaks since we aren't uploading it
      if (fs.existsSync(pdfLocalPath)) {
        fs.unlinkSync(pdfLocalPath);
      }
      // Fallback PDF link
      pdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    }

    if (!pdfUrl) {
      console.error(`[WHATSAPP NOTIFICATION ERROR] No PDF URL available. Skipping WhatsApp message.`);
      return;
    }

    // 6. Send Meta WhatsApp Message
    const amountVal = payment.paidNow || payment.paidAmount || 0;
    const result = await metaWhatsAppService.sendPaymentReceived({
      phone: formattedWhatsApp,
      clientName: client.personalInfo?.name || payment.clientName || 'Client',
      gymName: gym.gymName,
      amount: String(amountVal),
      pdfUrl,
      paymentId: payment.paymentId,
      clientId: client._id,
      gymId: gym.gymId
    });

    if (result && result.success) {
      console.log(`[WHATSAPP NOTIFICATION SUCCESS] Message sent. ID: ${result.messageId}`);
      
      // Update Payment record
      await runWithTenantContext({ tenantDb: conn, models: { Payment: PaymentModel } }, async () => {
        await PaymentModel.updateOne(
          { _id: payment._id },
          { $set: { billSentViaWhatsApp: true } }
        );
      });
      console.log(`[WHATSAPP NOTIFICATION] Payment record updated: billSentViaWhatsApp = true`);
    } else {
      console.error(`[WHATSAPP NOTIFICATION ERROR] Meta API failed: ${result?.error || 'Unknown error'}`);
    }
  } catch (err) {
    console.error(`[WHATSAPP NOTIFICATION CRITICAL ERROR] Workflow crash: ${err.message}`, err);
  }
};

module.exports = { sendPaymentNotification };
