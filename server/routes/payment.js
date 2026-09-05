const express = require('express');
const { query } = require('express-validator');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const paymentController = require('../controllers/paymentController');
const {
  validate,
  mongoIdValidation,
  stringValidation,
  numberValidation
} = require('../middleware/validate');

const recordPaymentValidation = [
  mongoIdValidation('planId', 'body'),
  mongoIdValidation('clientId', 'body', true),
  stringValidation('planName', true),
  numberValidation('amount', true),
  numberValidation('paidAmount', true),
  stringValidation('paymentMethod', true)
];

const updatePaymentValidation = [
  mongoIdValidation('id', 'param'),
  numberValidation('additionalAmount', true),
  stringValidation('paymentMethod', true)
];

const overridePaymentValidation = [
  mongoIdValidation('id', 'param'),
  mongoIdValidation('planId', 'body'),
  numberValidation('amount', true),
  numberValidation('paidAmount', true),
  stringValidation('paymentMethod', true)
];

router.route('/')
  .post(protect, authorize('owner', 'client'), recordPaymentValidation, validate, paymentController.recordPayment)
  .get(protect, authorize('owner', 'superadmin'), [query('gymId').optional().isString().trim()], validate, paymentController.getPayments);

router.post('/create-order', protect, authorize('owner', 'client'), [
  mongoIdValidation('planId', 'body', true),
  mongoIdValidation('paymentId', 'body', true)
], validate, paymentController.createRazorpayOrder);

router.route('/:id')
  .put(protect, authorize('owner', 'client'), updatePaymentValidation, validate, paymentController.updatePayment);

router.put('/:id/override', protect, authorize('owner'), overridePaymentValidation, validate, paymentController.overridePaymentPlan);

router.get('/:id/pdf', protect, authorize('owner', 'client'), paymentController.downloadInvoicePDF);
router.post('/:id/send-whatsapp', protect, authorize('owner'), paymentController.resendWhatsAppInvoice);

module.exports = router;
