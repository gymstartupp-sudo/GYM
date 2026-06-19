const express = require('express');
const { param } = require('express-validator');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const gymController = require('../controllers/gymController');
const {
  validate,
  emailValidation,
  phoneValidation,
  stringValidation
} = require('../middleware/validate');

const gymProfileValidation = [
  emailValidation('gym.gymEmail', true),
  phoneValidation('gym.gymContact', true),
  emailValidation('owner.mailId', true),
  phoneValidation('owner.mobileNo', true)
];

const changePasswordValidation = [
  stringValidation('currentPassword'),
  stringValidation('newPassword')
];

router.get('/public/:gymId', [param('gymId').isString().trim().notEmpty()], validate, gymController.getGymPublicProfile);

router.get('/profile', protect, authorize('owner'), gymController.getGymProfile);
router.put('/profile', protect, authorize('owner'), gymProfileValidation, validate, gymController.updateGymProfile);
router.put('/change-password', protect, authorize('owner'), changePasswordValidation, validate, gymController.changeGymPassword);
router.get('/dashboard', protect, authorize('owner'), gymController.getDashboardStats);

module.exports = router;
