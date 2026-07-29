const { body, query, param, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const extractedErrors = errors.array().map(err => ({
    field: err.path || err.param,
    message: err.msg
  }));

  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: extractedErrors,
  });
};

// Reusable email field validation helper
const emailValidation = (field, optional = false) => {
  let chain = body(field);
  if (optional) {
    chain = chain.optional({ nullable: true, checkFalsy: true });
  } else {
    chain = chain.exists().withMessage(`${field} is required`);
  }
  return chain
    .isString().withMessage(`${field} must be a string primitive`)
    .trim()
    .toLowerCase()
    .isEmail().withMessage(`Please include a valid email`);
};

// Reusable phone field validation helper
const phoneValidation = (field, optional = false) => {
  let chain = body(field);
  if (optional) {
    chain = chain.optional({ nullable: true, checkFalsy: true });
  } else {
    chain = chain.exists().withMessage(`${field} is required`);
  }
  return chain
    .isString().withMessage(`${field} must be a string primitive`)
    .trim()
    .matches(/^[6-9]\d{9}$/).withMessage(`Please enter a valid 10-digit mobile number starting with 6-9`);
};

// Reusable Mongo ID validation helper
const mongoIdValidation = (field, source = 'param', optional = false) => {
  let chain;
  if (source === 'param') {
    chain = param(field);
  } else if (source === 'query') {
    chain = query(field);
  } else {
    chain = body(field);
  }

  if (optional) {
    chain = chain.optional({ nullable: true, checkFalsy: true });
  } else {
    chain = chain.exists().withMessage(`${field} is required`);
  }

  return chain
    .isString().withMessage(`${field} must be a string primitive`)
    .trim()
    .isMongoId().withMessage(`Invalid ${field} ID format`);
};

// Reusable generic string validator
const stringValidation = (field, optional = false, options = {}) => {
  let chain = body(field);
  if (optional) {
    chain = chain.optional({ nullable: true, checkFalsy: true });
  } else {
    chain = chain.exists().withMessage(`${field} is required`);
  }

  chain = chain.isString().withMessage(`${field} must be a string primitive`).trim();
  
  if (options.min !== undefined || options.max !== undefined) {
    chain = chain.isLength({ min: options.min, max: options.max })
      .withMessage(`${field} must be between ${options.min || 0} and ${options.max || 'unlimited'} characters`);
  }

  return chain;
};

// Reusable generic number validator
const numberValidation = (field, optional = false, options = {}) => {
  let chain = body(field);
  if (optional) {
    chain = chain.optional({ nullable: true, checkFalsy: true });
  } else {
    chain = chain.exists().withMessage(`${field} is required`);
  }

  chain = chain.isNumeric().withMessage(`${field} must be a number`);

  if (options.min !== undefined) {
    chain = chain.custom((val) => {
      if (Number(val) < options.min) {
        throw new Error(`${field} must be at least ${options.min}`);
      }
      return true;
    });
  }

  if (options.max !== undefined) {
    chain = chain.custom((val) => {
      if (Number(val) > options.max) {
        throw new Error(`${field} cannot exceed ${options.max}`);
      }
      return true;
    });
  }

  return chain;
};

// Reusable password strength validation helper
const passwordValidation = (field = 'password', optional = false) => {
  const passwordMessage = 'Password must be at least 8 characters with 1 uppercase and 1 number';
  return stringValidation(field, optional)
    .isLength({ min: 8 })
    .withMessage(passwordMessage)
    .matches(/^(?=.*[A-Z])(?=.*\d).+$/)
    .withMessage(passwordMessage);
};

// Robust external URL validation helper (allows http and https only)
const isValidExternalUrl = (urlStr) => {
  if (typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const urlValidation = (field, optional = false) => {
  let chain = body(field);
  if (optional) {
    chain = chain.optional({ nullable: true, checkFalsy: true });
  } else {
    chain = chain.exists().withMessage(`${field} is required`);
  }
  return chain
    .isString().withMessage(`${field} must be a string primitive`)
    .trim()
    .custom((val) => {
      if (!isValidExternalUrl(val)) {
        throw new Error(`${field} must be a valid URL with http or https protocol`);
      }
      return true;
    });
};

module.exports = {
  validate,
  emailValidation,
  phoneValidation,
  mongoIdValidation,
  stringValidation,
  numberValidation,
  passwordValidation,
  isValidExternalUrl,
  urlValidation
};
