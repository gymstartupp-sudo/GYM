const Plan = require('../models/Plan');

// @desc    Create a new plan
// @route   POST /api/plan
// @access  Private (Owner)
exports.createPlan = async (req, res, next) => {
  try {
    const { name, durationMonths, price, description, isCustom, partialPaymentDueDays } = req.body;
    const gymId = req.user.gymId;

    if (!price) {
      return res.status(400).json({ success: false, message: 'Price is required' });
    }

    if (name && name.length > 25) {
      return res.status(400).json({ success: false, message: 'Plan name cannot exceed 25 characters' });
    }
    if (durationMonths && Number(durationMonths) > 12) {
      return res.status(400).json({ success: false, message: 'Plan duration cannot exceed 12 months' });
    }
    if (price && Number(price) >= 100000) {
      return res.status(400).json({ success: false, message: 'Plan price must be under 1 Lakh' });
    }
    if (description && description.length > 150) {
      return res.status(400).json({ success: false, message: 'Plan description cannot exceed 150 characters' });
    }

    // Input Normalization
    const cleanName = name ? name.trim().replace(/\s+/g, ' ') : '';
    const normalizedName = cleanName.toLowerCase();

    // Check Case-Insensitive Duplicate Name across all active plans
    const nameConflict = await Plan.findOne({ normalizedName, isActive: true });
    if (nameConflict) {
      return res.status(400).json({
        success: false,
        message: `A membership plan named "${cleanName}" already exists.`
      });
    }

    // Check Duplicate Duration for Standard Plans
    if (!isCustom) {
      const durationConflict = await Plan.findOne({
        durationMonths: Number(durationMonths),
        isCustom: false,
        isActive: true
      });
      if (durationConflict) {
        return res.status(400).json({
          success: false,
          message: `A standard ${durationMonths} Month membership plan already exists.`
        });
      }
    }

    const plan = await Plan.create({
      gymId,
      name: cleanName,
      durationMonths,
      price,
      description,
      isCustom: !!isCustom,
      partialPaymentDueDays: partialPaymentDueDays !== undefined ? Number(partialPaymentDueDays) : 15
    });

    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A duplicate membership plan or standard duration is already active in the system.'
      });
    }
    next(err);
  }
};

// @desc    Get all plans for a gym
// @route   GET /api/plan
// @access  Public or Private
exports.getPlans = async (req, res, next) => {
  try {
    const Client = require('../models/Client');
    const plans = await Plan.find({ isActive: true }).lean();

    // Enrich each plan with isAssigned check and client usage count
    const enrichedPlans = await Promise.all(plans.map(async (plan) => {
      const isAssigned = await Client.exists({
        $or: [
          { 'membership.planId': plan._id },
          { 'memberships.planId': plan._id }
        ]
      });
      const clientCount = await Client.countDocuments({
        $or: [
          { 'membership.planId': plan._id },
          { 'membership.planName': plan.name }
        ],
        isActive: true,
        isDeleted: { $ne: true }
      });
      return { ...plan, isAssigned: !!isAssigned, clientCount };
    }));

    res.status(200).json({ success: true, data: enrichedPlans });
  } catch (err) {
    next(err);
  }
};

// @desc    Update a plan
// @route   PUT /api/plan/:id
// @access  Private (Owner)
exports.updatePlan = async (req, res, next) => {
  try {
    const { name, durationMonths, price, description, isCustom, partialPaymentDueDays } = req.body;

    if (name && name.length > 25) {
      return res.status(400).json({ success: false, message: 'Plan name cannot exceed 25 characters' });
    }
    if (durationMonths && Number(durationMonths) > 12) {
      return res.status(400).json({ success: false, message: 'Plan duration cannot exceed 12 months' });
    }
    if (price && Number(price) >= 100000) {
      return res.status(400).json({ success: false, message: 'Plan price must be under 1 Lakh' });
    }
    if (description && description.length > 150) {
      return res.status(400).json({ success: false, message: 'Plan description cannot exceed 150 characters' });
    }

    let plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    // Protect historical membership records if the plan is assigned to clients
    const Client = require('../models/Client');
    const mongoose = require('mongoose');
    const planObjectId = new mongoose.Types.ObjectId(req.params.id);
    const isAssigned = await Client.exists({
      $or: [
        { 'membership.planId': planObjectId },
        { 'memberships.planId': planObjectId }
      ]
    });

    if (isAssigned) {
      const isCustomChanged = isCustom !== undefined && isCustom !== plan.isCustom;
      const durationChanged = durationMonths !== undefined && Number(durationMonths) !== plan.durationMonths;
      if (isCustomChanged || durationChanged) {
        return res.status(400).json({
          success: false,
          message: 'This membership plan has already been assigned to clients and its duration or type cannot be changed.'
        });
      }
    }

    // Input Normalization
    const cleanName = name ? name.trim().replace(/\s+/g, ' ') : '';
    const normalizedName = cleanName.toLowerCase();

    // Check Case-Insensitive Duplicate Name excluding this plan
    if (cleanName) {
      const nameConflict = await Plan.findOne({
        _id: { $ne: req.params.id },
        normalizedName,
        isActive: true
      });
      if (nameConflict) {
        return res.status(400).json({
          success: false,
          message: `A membership plan named "${cleanName}" already exists.`
        });
      }
    }

    // Check Duplicate Duration for Standard Plans excluding this plan
    const finalIsCustom = isCustom !== undefined ? isCustom : plan.isCustom;
    const finalDurationMonths = durationMonths !== undefined ? Number(durationMonths) : plan.durationMonths;
    if (!finalIsCustom) {
      const durationConflict = await Plan.findOne({
        _id: { $ne: req.params.id },
        durationMonths: finalDurationMonths,
        isCustom: false,
        isActive: true
      });
      if (durationConflict) {
        return res.status(400).json({
          success: false,
          message: `A standard ${finalDurationMonths} Month membership plan already exists.`
        });
      }
    }

    plan = await Plan.findByIdAndUpdate(req.params.id, {
      name: cleanName || plan.name,
      durationMonths: finalDurationMonths,
      price: price !== undefined ? price : plan.price,
      description: description !== undefined ? description : plan.description,
      isCustom: finalIsCustom,
      partialPaymentDueDays: partialPaymentDueDays !== undefined ? Number(partialPaymentDueDays) : plan.partialPaymentDueDays
    }, { new: true, runValidators: true });

    res.status(200).json({ success: true, data: plan });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A duplicate membership plan or standard duration is already active in the system.'
      });
    }
    next(err);
  }
};

// @desc    Delete (deactivate) a plan
// @route   DELETE /api/plan/:id
// @access  Private (Owner)
exports.deletePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    // Mark plan as inactive (Soft Delete)
    await Plan.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
