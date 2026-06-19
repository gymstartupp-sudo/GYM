const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense
} = require('../controllers/expenseController');
const {
  validate,
  mongoIdValidation,
  stringValidation,
  numberValidation
} = require('../middleware/validate');

const { uploadBill } = require('../middleware/upload');

const createExpenseValidation = [
  stringValidation('title'),
  numberValidation('amount'),
  stringValidation('date', true),
  stringValidation('category', true),
  stringValidation('paymentMethod', true),
  stringValidation('note', true)
];

const updateExpenseValidation = [
  mongoIdValidation('id', 'param'),
  stringValidation('title', true),
  numberValidation('amount', true),
  stringValidation('date', true),
  stringValidation('category', true),
  stringValidation('paymentMethod', true),
  stringValidation('note', true)
];

router.use(protect);
router.use(authorize('owner'));

router.route('/')
  .get(getExpenses)
  .post(uploadBill.single('billImage'), createExpenseValidation, validate, createExpense);

router.route('/:id')
  .put(uploadBill.single('billImage'), updateExpenseValidation, validate, updateExpense)
  .delete([mongoIdValidation('id', 'param')], validate, deleteExpense);

module.exports = router;
