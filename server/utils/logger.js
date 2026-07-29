/**
 * Centralized Logger Utility
 * Provides structured logging with automated PII and credential redaction.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'authorization',
  'auth',
  'secret',
  'otp',
  'phone',
  'phonenumber',
  'phone_number',
  'recipient_id',
  'email',
  'credentials',
  'verify_token',
  'hub.verify_token'
]);

/**
 * Mask a phone string (e.g., "+919876543210" -> "+91******3210")
 */
const maskPhone = (phone) => {
  if (typeof phone !== 'string') return '[REDACTED_PHONE]';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    const visible = digits.slice(-4);
    return `+${digits.slice(0, digits.length - 10)}******${visible}`;
  }
  return '[REDACTED_PHONE]';
};

/**
 * Sanitize strings containing sensitive data like Mongo URI passwords or raw phone numbers
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  // Redact Mongo URIs containing user:password@
  let sanitized = str.replace(/(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/gi, '$1[REDACTED]:[REDACTED]@');
  return sanitized;
};

/**
 * Recursively redact sensitive fields from objects or arrays
 */
const redact = (data, depth = 0) => {
  if (depth > 5) return '[MAX_DEPTH_EXCEEDED]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return sanitizeString(data);
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redact(item, depth + 1));
  }

  if (data instanceof Error) {
    return {
      message: sanitizeString(data.message),
      name: data.name,
      stack: process.env.NODE_ENV === 'production' ? undefined : sanitizeString(data.stack)
    };
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      if (lowerKey.includes('phone') && typeof value === 'string') {
        cleaned[key] = maskPhone(value);
      } else {
        cleaned[key] = '[REDACTED]';
      }
    } else {
      cleaned[key] = redact(value, depth + 1);
    }
  }
  return cleaned;
};

const formatArgs = (args) => {
  return args.map((arg) => {
    if (arg === null || arg === undefined) return String(arg);
    if (typeof arg === 'string') return sanitizeString(arg);
    if (typeof arg === 'object') {
      const redacted = redact(arg);
      if (redacted && typeof redacted === 'object') {
        if (redacted.message && (redacted.stack || redacted.name)) {
          return `${redacted.name || 'Error'}: ${redacted.message}${redacted.stack ? '\n' + redacted.stack : ''}`;
        }
        return JSON.stringify(redacted, null, 2);
      }
      return String(redacted);
    }
    return String(arg);
  }).join(' ');
};

const logger = {
  info: (...args) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${formatArgs(args)}`);
  },

  warn: (...args) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${formatArgs(args)}`);
  },

  error: (...args) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${formatArgs(args)}`);
  },

  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] [${new Date().toISOString()}] ${formatArgs(args)}`);
    }
  },

  redact,
  maskPhone
};

module.exports = logger;
