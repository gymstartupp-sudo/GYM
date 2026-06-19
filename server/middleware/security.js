const hasMongoOperatorOrPrototypePollution = (obj) => {
  if (!obj || typeof obj !== 'object') return false;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (hasMongoOperatorOrPrototypePollution(item)) return true;
    }
    return false;
  }

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Prototype pollution prevention
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return true;
      }
      // MongoDB operator prevention
      if (key.startsWith('$')) {
        return true;
      }
      // Block dot in user-supplied keys to prevent arbitrary nested querying or query injection
      if (key.includes('.')) {
        return true;
      }
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (hasMongoOperatorOrPrototypePollution(obj[key])) return true;
      }
    }
  }
  return false;
};

const blockNoSqlInjection = (req, res, next) => {
  if (
    hasMongoOperatorOrPrototypePollution(req.body) ||
    hasMongoOperatorOrPrototypePollution(req.query) ||
    hasMongoOperatorOrPrototypePollution(req.params)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Malicious payload or invalid structure detected'
    });
  }
  next();
};

module.exports = { blockNoSqlInjection, hasMongoOperatorOrPrototypePollution };
