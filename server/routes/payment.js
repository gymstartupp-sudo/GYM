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

router.route('/')
  .post(protect, authorize('owner', 'client'), recordPaymentValidation, validate, paymentController.recordPayment)
  .get(protect, authorize('owner', 'superadmin'), [query('gymId').optional().isString().trim()], validate, paymentController.getPayments);

router.post('/create-order', protect, authorize('owner', 'client'), [
  mongoIdValidation('planId', 'body', true),
  mongoIdValidation('paymentId', 'body', true)
], validate, paymentController.createRazorpayOrder);

router.route('/:id')
  .put(protect, authorize('owner', 'client'), updatePaymentValidation, validate, paymentController.updatePayment);

module.exports = router;
