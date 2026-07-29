const express = require('express');
const router = express.Router();
const Gym = require('../models/Gym');
const { getTenantConnection } = require('../utils/connectionManager');
const logger = require('../utils/logger');

// Meta Webhook Verification (GET /api/webhook)
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const localVerifyToken = process.env.META_VERIFY_TOKEN || 'my_verify_token';

  if (mode && token) {
    if (mode === 'subscribe' && token === localVerifyToken) {
      logger.info('[META WEBHOOK] Verification successful.');
      return res.status(200).send(challenge);
    } else {
      logger.warn('[META WEBHOOK] Verification failed. Token mismatch.');
      return res.sendStatus(403);
    }
  }
  return res.sendStatus(400);
});

// Meta Webhook Status Updates (POST /api/webhook)
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    logger.info('[META WEBHOOK] Received payload:', logger.redact(body));

    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const statuses = value?.statuses;

      if (statuses && Array.isArray(statuses)) {
        for (const statusObj of statuses) {
          const { id, status, recipient_id, errors } = statusObj;
          logger.info(`[META WEBHOOK STATUS UPDATE] Message ID: ${id}, Status: ${status}, Recipient: ${logger.maskPhone(recipient_id)}`);

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
                logger.info(`[META WEBHOOK SUCCESS] Updated payment ${payment.paymentId} to status: ${status}`);
                matched = true;
                break;
              }
            } catch (connErr) {
              logger.error(`Error querying tenant DB in webhook:`, connErr.message);
            }
          }

          if (!matched) {
            logger.info(`[META WEBHOOK INFO] Message ID ${id} did not match any stored invoiceMessageId.`);
          }
        }
      }
    }
    return res.sendStatus(200);
  } catch (err) {
    logger.error('[META WEBHOOK ERROR]:', err.message);
    return res.sendStatus(500);
  }
});

module.exports = router;
