const express = require('express');
const router = express.Router();
const { getStaff, addStaff, updateStaff, deleteStaff } = require('../controllers/staffController');
const { validate, stringValidation, phoneValidation, emailValidation, numberValidation } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('owner', 'admin'));

const staffValidation = [
  stringValidation('name', false, { min: 2, max: 35 }),
  stringValidation('role', false, { min: 2, max: 35 }),
  phoneValidation('phone', false),
  emailValidation('email', true),
  stringValidation('address', true, { max: 100 }),
  numberValidation('salary', true, { min: 0 })
];

router.route('/')
  .get(getStaff)
  .post(staffValidation, validate, addStaff);

router.route('/:id')
  .put(staffValidation, validate, updateStaff)
  .delete(deleteStaff);

module.exports = router;
