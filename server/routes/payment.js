const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const paymentController = require('../controllers/paymentController');

router.route('/')
  .post(protect, authorize('owner', 'client'), paymentController.recordPayment)
  .get(protect, authorize('owner', 'superadmin'), paymentController.getPayments);

router.post('/create-order', protect, authorize('owner', 'client'), paymentController.createRazorpayOrder);

router.route('/:id')
  .put(protect, authorize('owner', 'client'), paymentController.updatePayment);

module.exports = router;
