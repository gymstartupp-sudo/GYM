const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const leadController = require('../controllers/leadController');
const { validate, stringValidation, phoneValidation } = require('../middleware/validate');

const addLeadValidation = [
  stringValidation('name'),
  phoneValidation('phone')
];

router.route('/')
  .get(protect, authorize('owner', 'superadmin', 'developer'), leadController.getLeads)
  .post(protect, authorize('owner'), addLeadValidation, validate, leadController.addLead);

router.route('/:id')
  .put(protect, authorize('owner'), addLeadValidation, validate, leadController.updateLead)
  .delete(protect, authorize('owner'), leadController.deleteLead);

module.exports = router;
