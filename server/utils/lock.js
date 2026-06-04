const activeLocks = new Set();

/**
 * Acquire a lock for a given key.
 * Returns true if lock was acquired successfully, false if already locked.
 * @param {string} key 
 * @returns {boolean}
 */
const acquireLock = (key) => {
  if (activeLocks.has(key)) {
    return false;
  }
  activeLocks.add(key);
  return true;
};

/**
 * Release a lock for a given key.
 * @param {string} key 
 */
const releaseLock = (key) => {
  activeLocks.delete(key);
};

module.exports = {
  acquireLock,
  releaseLock
};
