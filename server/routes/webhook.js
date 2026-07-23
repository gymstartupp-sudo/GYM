const express = require('express');
const router = express.Router();
const Gym = require('../models/Gym');
const { getTenantConnection } = require('../utils/connectionManager');

// Meta Webhook Verification (GET /api/webhook)
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const localVerifyToken = process.env.META_VERIFY_TOKEN || 'my_verify_token';

  if (mode && token) {
    if (mode === 'subscribe' && token === localVerifyToken) {
      console.log('[META WEBHOOK] Verification successful.');
      return res.status(200).send(challenge);
    } else {
      console.warn('[META WEBHOOK] Verification failed. Token mismatch.');
      return res.sendStatus(403);
    }
  }
  return res.sendStatus(400);
});

// Meta Webhook Status Updates (POST /api/webhook)
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    console.log('[META WEBHOOK] Received payload:', JSON.stringify(body, null, 2));

    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const statuses = value?.statuses;

      if (statuses && Array.isArray(statuses)) {
        for (const statusObj of statuses) {
          const { id, status, recipient_id, errors } = statusObj;
          console.log(`[META WEBHOOK STATUS UPDATE] Message ID: ${id}, Status: ${status}, Recipient: ${recipient_id}`);

          // Find which tenant database has this invoiceMessageId
          const activeGyms = await Gym.find({ isActive: true });
          let matched = false;

          for (const gym of activeGyms) {
            try {
              const conn = await getTenantConnection(gym.dbName);
              const PaymentModel = conn.models.Payment || conn.model('Payment', require('../models/Payment').schema);

              const payment = await PaymentModel.findOne({ invoiceMessageId: id });
              if (payment) {
                payment.invoiceWhatsAppStatus = status;
                if (status === 'failed' && errors && errors[0]) {
                  payment.invoiceError = errors[0].message || 'Meta delivery failure';
                } else {
                  payment.invoiceError = null;
                }
                await payment.save();
                console.log(`[META WEBHOOK SUCCESS] Updated payment ${payment.paymentId} in DB ${gym.dbName} to status: ${status}`);
                matched = true;
                break;
              }
            } catch (connErr) {
              console.error(`Error querying tenant DB ${gym.dbName} in webhook:`, connErr);
            }
          }

          if (!matched) {
            console.log(`[META WEBHOOK INFO] Message ID ${id} did not match any stored invoiceMessageId.`);
          }
        }
      }
    }
    return res.sendStatus(200);
  } catch (err) {
    console.error('[META WEBHOOK ERROR]:', err);
    return res.sendStatus(500);
  }
});

module.exports = router;
