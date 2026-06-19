const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const {
  validate,
  emailValidation,
  phoneValidation,
  stringValidation
} = require('../middleware/validate');
const { uploadLogo } = require('../middleware/upload');

const phoneMessage = 'Please enter a valid 10-digit phone number';
const passwordMessage = 'Password must be at least 8 characters with 1 uppercase and 1 number';

// Gym Owner Validations
const gymRegisterValidation = [
  stringValidation('gymIdPrefix', false).withMessage('Gym ID prefix is required'),
  stringValidation('gymName', false).withMessage('Gym Name is required'),
  emailValidation('gymEmail'),
  phoneValidation('gymContact'),
  stringValidation('password')
    .isLength({ min: 8 })
    .withMessage(passwordMessage)
    .matches(/^(?=.*[A-Z])(?=.*\d).+$/)
    .withMessage(passwordMessage),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password confirmation does not match password');
    }
    return true;
  }),
  stringValidation('name', false).withMessage('Owner Name is required'),
  phoneValidation('mobileNo'),
  emailValidation('mailId')
];

const universalLoginValidation = [
  body('loginId')
    .isString().withMessage('Login ID must be a string')
    .trim()
    .notEmpty().withMessage('Email or Phone is required'),
  body('password')
    .isString().withMessage('Password must be a string')
    .notEmpty().withMessage('Password is required')
];

// Client Validations
const clientRegisterValidation = [
  stringValidation('gymId', false).withMessage('Gym ID is required'),
  stringValidation('name', false).withMessage('Name is required'),
  emailValidation('email'),
  phoneValidation('mobileNo'),
  stringValidation('dob').isISO8601().withMessage('Date of birth is required').toDate().custom((value) => {
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
  stringValidation('startDate').isISO8601().withMessage('Start date is required').toDate().custom((value) => {
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
  stringValidation('password')
    .isLength({ min: 8 })
    .withMessage(passwordMessage)
    .matches(/^(?=.*[A-Z])(?=.*\d).+$/)
    .withMessage(passwordMessage),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password confirmation does not match password');
    }
    return true;
  })
];

const checkExistsValidation = [
  emailValidation('email', true),
  phoneValidation('phone', true)
];

// Routes
router.post('/check-exists', checkExistsValidation, validate, authController.checkExists);

router.post('/gym/register', uploadLogo.single('logo'), gymRegisterValidation, validate, authController.registerGymOwner);
router.post('/client/register', clientRegisterValidation, validate, authController.registerClient);

router.post('/login', universalLoginValidation, validate, authController.universalLogin);

module.exports = router;
