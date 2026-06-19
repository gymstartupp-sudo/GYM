const express = require('express');
const { param, query } = require('express-validator');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const planController = require('../controllers/planController');
const {
  validate,
  mongoIdValidation,
  stringValidation,
  numberValidation
} = require('../middleware/validate');

const createPlanValidation = [
  stringValidation('name'),
  numberValidation('price'),
  numberValidation('durationMonths')
];

const updatePlanValidation = [
  mongoIdValidation('id', 'param'),
  stringValidation('name', true),
  numberValidation('price', true),
  numberValidation('durationMonths', true)
];

const getPlansValidation = [
  query('gymId').optional().isString().trim()
];

// All plan routes need authentication, though getPlans could be public for registration
router.route('/')
  .post(protect, authorize('owner'), createPlanValidation, validate, planController.createPlan)
  .get(protect, getPlansValidation, validate, planController.getPlans); // clients and owners can see plans

// Public route to fetch plans for registration form by gymId
// Adding a special public route just in case
router.get('/public/:gymId', [param('gymId').isString().trim().notEmpty()], validate, async (req, res, next) => {
  try {
    const Plan = require('../models/Plan');
    const gymId = req.params.gymId;
    const plans = await Plan.find({ gymId, isActive: true });

    res.status(200).json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
});

router.route('/:id')
  .put(protect, authorize('owner'), updatePlanValidation, validate, planController.updatePlan)
  .delete(protect, authorize('owner'), [mongoIdValidation('id', 'param')], validate, planController.deletePlan);

module.exports = router;
