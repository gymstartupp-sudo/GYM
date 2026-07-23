const Gym = require('../models/Gym');
const Client = require('../models/Client');
const Payment = require('../models/Payment');
const Counter = require('../models/Counter');

const getNextSequenceValue = async (name) => {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { value: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  return counter.value;
};

const generateGymId = async () => {
  const prefix = 'NEX';

  // 1. Ensure concurrency safety using an atomic counter
  const counterName = 'NEX_GYM_SEQUENCE';
  let sequence = await getNextSequenceValue(counterName);

  // 2. To handle existing data (last count = 5) and ensure continuity:
  // Fetch the latest gymId starting with NEX- to verify the counter is in sync
  const lastGym = await Gym.findOne({ gymId: new RegExp(`^${prefix}-`) }).sort({ gymId: -1 });
  
  let lastCount = 0;
  if (lastGym && lastGym.gymId) {
    const parts = lastGym.gymId.split('-');
    lastCount = parseInt(parts[1], 10) || 0;
  }

  // 3. If counter is behind existing records, fast-forward it
  if (sequence <= lastCount) {
    const correctedCounter = await Counter.findOneAndUpdate(
      { name: counterName },
      { $set: { value: lastCount + 1 } },
      { new: true, upsert: true }
    );
    sequence = correctedCounter.value;
  }

  return `${prefix}-${String(sequence).padStart(2, '0')}`;
};

const generateClientId = async (gymIdStr) => {
  const counterName = `clientId:${gymIdStr}`;
  let sequence = await getNextSequenceValue(counterName);

  // Sync/Correction: check highest existing clientId for this gym to avoid collisions
  const clients = await Client.find({
    gymId: gymIdStr,
    clientId: new RegExp('^CL-')
  }, { clientId: 1 }).lean();

  let lastCount = 0;
  for (const c of clients) {
    if (c.clientId) {
      const parts = c.clientId.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num) && num > lastCount) {
        lastCount = num;
      }
    }
  }

  if (sequence <= lastCount) {
    const correctedCounter = await Counter.findOneAndUpdate(
      { name: counterName },
      { $set: { value: lastCount + 1 } },
      { new: true, upsert: true }
    );
    sequence = correctedCounter.value;
  }

  return `CL-${String(sequence).padStart(2, '0')}`;
};

const generatePaymentId = async (gymId, billingPrefix) => {
  const counterName = `paymentId:${gymId}:${billingPrefix.toUpperCase()}`;
  let sequence = await getNextSequenceValue(counterName);

  // Sync/Correction: check highest existing paymentId for this prefix and gymId to avoid collisions
  const escapedPrefix = billingPrefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const payments = await Payment.find({
    gymId,
    paymentId: new RegExp(`^${escapedPrefix}-`)
  }, { paymentId: 1 }).lean();

  let lastCount = 0;
  for (const p of payments) {
    if (p.paymentId) {
      const parts = p.paymentId.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num) && num > lastCount) {
        lastCount = num;
      }
    }
  }

  if (sequence <= lastCount) {
    const correctedCounter = await Counter.findOneAndUpdate(
      { name: counterName },
      { $set: { value: lastCount + 1 } },
      { new: true, upsert: true }
    );
    sequence = correctedCounter.value;
  }

  const paddedCount = sequence.toString().padStart(3, '0');
  return `${billingPrefix}-${paddedCount}`;
};

module.exports = { generateGymId, generateClientId, generatePaymentId, getNextSequenceValue };
