const Plan = require('../models/Plan');

// @desc    Create a new plan
// @route   POST /api/plan
// @access  Private (Owner)
exports.createPlan = async (req, res, next) => {
  try {
    const { name, durationMonths, price, description, isCustom } = req.body;
    const gymId = req.user.gymId;

    if (!price) {
      return res.status(400).json({ success: false, message: 'Price is required' });
    }

    if (isCustom) {
      const existingPlan = await Plan.findOne({ name, gymId, isActive: true });
      if (existingPlan) {
        return res.status(400).json({ success: false, message: 'Plan already exists' });
      }
    } else {
      const existingPlan = await Plan.findOne({ durationMonths, isCustom: false, gymId, isActive: true });
      if (existingPlan) {
        return res.status(400).json({ success: false, message: 'Standard plan already created' });
      }
    }

    const plan = await Plan.create({
      gymId,
      name,
      durationMonths,
      price,
      description,
      isCustom: !!isCustom
    });

    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all plans for a gym
// @route   GET /api/plan
// @access  Public or Private
exports.getPlans = async (req, res, next) => {
  try {
    let gymId = null;
    if(req.userRole === 'owner') {
        gymId = req.user.gymId;
    } else if(req.userRole === 'client') {
        gymId = req.user.gymId;
    } else if(req.query.gymId) {
        gymId = req.query.gymId;
    }

    if(!gymId) {
        return res.status(400).json({ success: false, message: 'gymId is required' });
    }

    const plans = await Plan.find({ gymId, isActive: true }).lean();
    
    res.status(200).json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
};

// @desc    Update a plan
// @route   PUT /api/plan/:id
// @access  Private (Owner)
exports.updatePlan = async (req, res, next) => {
  try {
    const { name, durationMonths, price, description } = req.body;
    const gymId = req.user.gymId;

    let plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    if (plan.gymId !== gymId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    plan = await Plan.findByIdAndUpdate(req.params.id, { name, durationMonths, price, description }, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete (deactivate) a plan
// @route   DELETE /api/plan/:id
// @access  Private (Owner)
exports.deletePlan = async (req, res, next) => {
  try {
    const gymId = req.user.gymId;

    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    if (plan.gymId !== gymId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await Plan.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
