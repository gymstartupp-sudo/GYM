const Staff = require('../models/Staff');

// @desc    Get all staff
// @route   GET /api/staff
// @access  Private (Owner/Admin)
exports.getStaff = async (req, res, next) => {
  try {
    const staff = await Staff.find({ gymId: req.user.gymId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: staff.length, data: staff });
  } catch (err) {
    next(err);
  }
};

// @desc    Add new staff member
// @route   POST /api/staff
// @access  Private (Owner/Admin)
exports.addStaff = async (req, res, next) => {
  try {
    const staffData = { ...req.body, gymId: req.user.gymId };
    
    // Check if phone already exists in this gym
    const existingStaff = await Staff.findOne({ gymId: req.user.gymId, phone: staffData.phone });
    if (existingStaff) {
      return res.status(400).json({ success: false, message: 'A staff member with this phone number already exists' });
    }

    const staff = await Staff.create(staffData);
    res.status(201).json({ success: true, data: staff });
  } catch (err) {
    next(err);
  }
};

// @desc    Update staff member
// @route   PUT /api/staff/:id
// @access  Private (Owner/Admin)
exports.updateStaff = async (req, res, next) => {
  try {
    // Check phone uniqueness if phone is being updated
    if (req.body.phone) {
      const existingStaff = await Staff.findOne({ 
        gymId: req.user.gymId, 
        phone: req.body.phone,
        _id: { $ne: req.params.id }
      });
      if (existingStaff) {
        return res.status(400).json({ success: false, message: 'Another staff member already has this phone number' });
      }
    }

    const staff = await Staff.findOneAndUpdate(
      { _id: req.params.id, gymId: req.user.gymId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    res.status(200).json({ success: true, data: staff });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete staff member
// @route   DELETE /api/staff/:id
// @access  Private (Owner/Admin)
exports.deleteStaff = async (req, res, next) => {
  try {
    const staff = await Staff.findOneAndDelete({ _id: req.params.id, gymId: req.user.gymId });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
