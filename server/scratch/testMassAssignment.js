const { sanitizePayload } = require('../utils/allowlist');
const assert = require('assert');

console.log('--- Testing sanitizePayload Utility ---');

const ALLOWED_GYM_FIELDS = [
  'gymName', 'gymEmail', 'gymContact', 'address', 'city', 'state',
  'pincode', 'gst', 'gymLogo', 'tagline', 'gymType', 'operatingDays',
  'operatingHours', 'billingInfo', 'reminderSettings', 'socialMediaLinks'
];

// Test 1: Valid payload
const validPayload = {
  gymName: 'Power Gym',
  tagline: 'Stay Fit',
  address: '123 Main St'
};

const res1 = sanitizePayload(validPayload, ALLOWED_GYM_FIELDS);
assert.strictEqual(res1.hasInvalidFields, false, 'Valid payload should not have invalid fields');
assert.deepStrictEqual(res1.cleanData, validPayload, 'Clean data should match valid payload');
console.log('✅ Test 1 Passed: Valid payload accepted');

// Test 2: Exploit payload with restricted mass-assignment fields (subscription, isActive, gymId)
const exploitPayload = {
  gymName: 'Power Gym',
  subscription: 'Enterprise',
  isActive: true,
  gymId: 'NEX-01'
};

const res2 = sanitizePayload(exploitPayload, ALLOWED_GYM_FIELDS);
assert.strictEqual(res2.hasInvalidFields, true, 'Exploit payload should be rejected');
assert.deepStrictEqual(res2.invalidKeys, ['subscription', 'isActive', 'gymId']);
console.log('✅ Test 2 Passed: Restricted fields detected and rejected correctly:', res2.invalidKeys);

// Test 3: Top level keys check simulation
const ALLOWED_TOP_LEVEL = ['gymData', 'ownerData'];
const bodyWithExploit = {
  gymData: { gymName: 'Power Gym' },
  subscription: 'Enterprise' // Top-level mass assignment attempt
};

const topKeys = Object.keys(bodyWithExploit);
const invalidTopKeys = topKeys.filter(k => !ALLOWED_TOP_LEVEL.includes(k));
assert.strictEqual(invalidTopKeys.length, 1, 'Top level invalid key should be detected');
assert.strictEqual(invalidTopKeys[0], 'subscription');
console.log('✅ Test 3 Passed: Top-level injected field detected correctly:', invalidTopKeys);

console.log('\nAll Mass Assignment Security Checks PASSED Successfully!');
