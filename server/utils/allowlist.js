/**
 * allowlist.js
 * Centralized utility for sanitizing user payloads against explicit field allowlists.
 * Prevents Mass Assignment vulnerabilities by strictly enforcing allowed fields
 * and rejecting requests containing unauthorized or restricted properties.
 */

/**
 * Sanitizes a source object against an array of allowed field names.
 * @param {Object} source - The object to sanitize (e.g. req.body, req.body.gymData)
 * @param {Array<string>} allowedFields - List of explicitly allowed property names
 * @param {boolean} rejectUnknown - Whether to reject requests with extra/restricted fields (default: true)
 * @returns {{ cleanData: Object|null, hasInvalidFields: boolean, invalidKeys: Array<string> }}
 */
const sanitizePayload = (source, allowedFields, rejectUnknown = true) => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return { cleanData: {}, hasInvalidFields: false, invalidKeys: [] };
  }

  const sourceKeys = Object.keys(source);
  const invalidKeys = sourceKeys.filter(key => !allowedFields.includes(key));

  if (rejectUnknown && invalidKeys.length > 0) {
    return { cleanData: null, hasInvalidFields: true, invalidKeys };
  }

  const cleanData = {};
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      cleanData[field] = source[field];
    }
  }

  return { cleanData, hasInvalidFields: false, invalidKeys: [] };
};

module.exports = { sanitizePayload };
