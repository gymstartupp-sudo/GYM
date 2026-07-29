const Expense = require('../models/Expense');
const { uploadBillToCloudinary } = require('../utils/cloudinary');
const { sanitizePayload } = require('../utils/allowlist');

const ALLOWED_EXPENSE_FIELDS = [
  'title', 'amount', 'category', 'date', 'paymentMethod', 'note', 'vendor', 'billImage'
];

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private (Owner)
exports.getExpenses = async (req, res, next) => {
  try {
    const expenses = await Expense.find({}).sort({ date: -1 }).lean();
    res.status(200).json({ success: true, count: expenses.length, data: expenses });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new expense
// @route   POST /api/expenses
// @access  Private (Owner)
exports.createExpense = async (req, res, next) => {
  try {
    const { cleanData, hasInvalidFields } = sanitizePayload(req.body, ALLOWED_EXPENSE_FIELDS);
    if (hasInvalidFields) {
      return res.status(400).json({ success: false, message: 'Request contains restricted or invalid fields.' });
    }

    cleanData.gymId = req.user.gymId;
    
    if (cleanData.amount && Number(cleanData.amount) > 10000000) {
      return res.status(400).json({ success: false, message: 'Expense amount cannot exceed 1 crore (₹10,000,000)' });
    }
    if (cleanData.note && cleanData.note.length > 100) {
      return res.status(400).json({ success: false, message: 'Notes cannot exceed 100 characters' });
    }

    if (req.file) {
      const billUrl = await uploadBillToCloudinary(req.file.path);
      cleanData.billImage = billUrl;
    }

    const expense = await Expense.create(cleanData);
    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private (Owner)
exports.updateExpense = async (req, res, next) => {
  try {
    let expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const { cleanData, hasInvalidFields } = sanitizePayload(req.body, ALLOWED_EXPENSE_FIELDS);
    if (hasInvalidFields) {
      return res.status(400).json({ success: false, message: 'Request contains restricted or invalid fields.' });
    }

    if (cleanData.amount && Number(cleanData.amount) > 10000000) {
      return res.status(400).json({ success: false, message: 'Expense amount cannot exceed 1 crore (₹10,000,000)' });
    }
    if (cleanData.note && cleanData.note.length > 100) {
      return res.status(400).json({ success: false, message: 'Notes cannot exceed 100 characters' });
    }

    if (req.file) {
      const billUrl = await uploadBillToCloudinary(req.file.path);
      cleanData.billImage = billUrl;
    }

    expense = await Expense.findByIdAndUpdate(req.params.id, { $set: cleanData }, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private (Owner)
exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    await expense.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
