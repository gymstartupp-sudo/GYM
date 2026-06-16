const Expense = require('../models/Expense');
const { uploadBillToCloudinary } = require('../utils/cloudinary');

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private (Owner)
exports.getExpenses = async (req, res, next) => {
  try {
    const gymIdStr = req.user.gymId;
    const expenses = await Expense.find({ gymId: gymIdStr }).sort({ date: -1 }).lean();
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
    req.body = req.body || {};
    req.body.gymId = req.user.gymId;
    
    if (req.body.amount && Number(req.body.amount) > 10000000) {
      return res.status(400).json({ success: false, message: 'Expense amount cannot exceed 1 crore (₹10,000,000)' });
    }
    if (req.body.note && req.body.note.length > 100) {
      return res.status(400).json({ success: false, message: 'Notes cannot exceed 100 characters' });
    }

    if (req.file) {
      const billUrl = await uploadBillToCloudinary(req.file.path);
      req.body.billImage = billUrl;
    }

    const expense = await Expense.create(req.body);
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

    // Make sure user owns expense
    if (expense.gymId !== req.user.gymId) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    if (req.body.amount && Number(req.body.amount) > 10000000) {
      return res.status(400).json({ success: false, message: 'Expense amount cannot exceed 1 crore (₹10,000,000)' });
    }
    if (req.body.note && req.body.note.length > 100) {
      return res.status(400).json({ success: false, message: 'Notes cannot exceed 100 characters' });
    }

    if (req.file) {
      const billUrl = await uploadBillToCloudinary(req.file.path);
      req.body.billImage = billUrl;
    }

    expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
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

    // Make sure user owns expense
    if (expense.gymId !== req.user.gymId) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    await expense.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
