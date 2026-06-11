const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { uploadLogo } = require('../middleware/upload');

const phoneMessage = 'Please enter a valid 10-digit phone number';
const passwordMessage = 'Password must be at least 8 characters with 1 uppercase and 1 number';

// Gym Owner Validations
const gymRegisterValidation = [
  body('gymIdPrefix', 'Gym ID prefix is required').notEmpty(),
  body('gymName', 'Gym Name is required').notEmpty(),
  body('gymEmail', 'Please include a valid email').isEmail(),
  body('gymContact', phoneMessage).matches(/^[0-9]{10}$/),
  body('password', passwordMessage)
    .isLength({ min: 8 })
    .matches(/^(?=.*[A-Z])(?=.*\d).+$/),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password confirmation does not match password');
    }
    return true;
  })
];

const universalLoginValidation = [
  body('loginId', 'Email or Phone is required').notEmpty(),
  body('password', 'Password is required').notEmpty()
];

// Client Validations
const clientRegisterValidation = [
  body('gymId', 'Gym ID is required').notEmpty(),
  body('name', 'Name is required').notEmpty(),
  body('email', 'Please include a valid email').isEmail(),
  body('mobileNo', phoneMessage).matches(/^[0-9]{10}$/),
  body('dob', 'Date of birth is required').notEmpty().isISO8601().toDate().custom((value) => {
    const today = new Date();
    const birthDate = new Date(value);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 14) {
      throw new Error('Must be at least 14 years old');
    }
    if (age > 100) {
      throw new Error('Date of birth is invalid (max 100 years old)');
    }
    return true;
  }),
  body('startDate', 'Start date is required').notEmpty().isISO8601().toDate().custom((value) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const minDate = new Date(today);
    minDate.setDate(today.getDate() - 30);

    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 90);

    if (value < minDate) {
      throw new Error('Start date cannot be more than 30 days in the past');
    }
    if (value > maxDate) {
      throw new Error('Start date cannot be more than 90 days in the future');
    }
    return true;
  }),
  body('password', passwordMessage)
    .isLength({ min: 8 })
    .matches(/^(?=.*[A-Z])(?=.*\d).+$/),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password confirmation does not match password');
    }
    return true;
  })
];

// Routes
router.post('/check-exists', authController.checkExists);

router.post('/gym/register', uploadLogo.single('logo'), gymRegisterValidation, validate, authController.registerGymOwner);
router.post('/client/register', clientRegisterValidation, validate, authController.registerClient);

router.post('/login', universalLoginValidation, validate, authController.universalLogin);

module.exports = router;
