const Payment = require('../models/Payment');
const Client = require('../models/Client');
const Gym = require('../models/Gym');
const { generatePaymentId } = require('../utils/generateId');
const sendWhatsApp = require('../utils/sendWhatsApp');
const { buildMembershipWindow } = require('../utils/membership');
const { syncClientStatus } = require('../utils/syncStatus');
const Razorpay = require('razorpay');

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID.trim(),
    key_secret: process.env.RAZORPAY_KEY_SECRET.trim()
  });
}


// Helper to assign or renew a plan
const assignOrRenewPlan = async (client, planId, startDateStr, paymentData = {}) => {
  const Plan = require('../models/Plan');
  const planDetails = await Plan.findById(planId);
  if (!planDetails) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Get current memberships and find the absolute latest end date
  const memberships = client.memberships || [];
  const latestPlan = memberships.length > 0 
    ? [...memberships].sort((a, b) => new Date(b.endDate) - new Date(a.endDate))[0]
    : null;

  let finalStartDate = startDateStr ? new Date(startDateStr) : new Date();
  finalStartDate.setHours(0, 0, 0, 0);

  // 2. Apply Non-Overlap Rule
  if (latestPlan) {
    const latestEndDate = new Date(latestPlan.endDate);
    latestEndDate.setHours(0, 0, 0, 0);

    if (finalStartDate <= latestEndDate) {
      // OVERLAP detected -> Auto shift
      const nextDay = new Date(latestEndDate);
      nextDay.setDate(nextDay.getDate() + 1);
      finalStartDate = nextDay;
    }
  }

  const { endDate } = buildMembershipWindow({
    startDate: finalStartDate,
    durationMonths: planDetails.durationMonths
  });

  const newPlan = {
    planId: planId,
    planName: planDetails.name,
    planDurationMonths: planDetails.durationMonths,
    startDate: finalStartDate,
    endDate: endDate,
    finalPrice: Number(paymentData.amount) || planDetails.price || 0,
    totalPaid: Number(paymentData.paidAmount) || 0,
    dueDate: paymentData.dueDate ? new Date(paymentData.dueDate) : null
  };

  if (!client.memberships) client.memberships = [];
  client.memberships.push(newPlan);

  // Note: client.membership (primary field) will be updated via syncClientStatus
  // called at the end of the recordPayment flow.
  
  return newPlan;
};

// @desc    Record Payment
// @route   POST /api/payment
// @access  Private (Owner)
exports.recordPayment = async (req, res, next) => {
  let lockKey = null;
  const { acquireLock, releaseLock } = require('../utils/lock');

  try {
    let { clientId, planId, planName, amount, paidAmount = 0, paymentMethod = 'cash', dueDate, startDate, idempotencyKey, razorpay_payment_id } = req.body;
    let gymIdStr = req.user.gymId;

    if (!planId) return res.status(400).json({ success: false, message: 'Plan is required for payment' });

    const Plan = require('../models/Plan');
    const planDetails = await Plan.findOne({ _id: planId, gymId: gymIdStr, isActive: true });
    if (!planDetails) {
      return res.status(400).json({ success: false, message: 'Selected plan not found or is inactive' });
    }

    // Securely derive client parameters if call is initiated from client login
    if (req.userRole === 'client') {
      clientId = req.user._id.toString();
      gymIdStr = req.user.gymId;

      planName = planDetails.name;
      amount = planDetails.price;
      
      // Validate paidAmount and ensure it does not exceed the secure plan price
      const requestedPaid = Number(paidAmount) || 0;
      if (requestedPaid > planDetails.price) {
        return res.status(400).json({ success: false, message: 'Paid amount cannot exceed plan price' });
      }
      paidAmount = requestedPaid;

      // Real Razorpay signature verification for client online payments
      if (paymentMethod === 'upi' || paymentMethod === 'card') {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
          return res.status(400).json({ success: false, message: 'Razorpay payment parameters are missing' });
        }
        
        const keySecret = process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.trim() : '';
        if (!keySecret) {
          return res.status(500).json({ success: false, message: 'Razorpay integration is not configured on the server.' });
        }

        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', keySecret);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature !== razorpay_signature) {
          return res.status(400).json({ success: false, message: 'Payment signature verification failed' });
        }
      }
    }

    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Client ID is required' });
    }

    lockKey = `payment-${clientId}`;
    if (!acquireLock(lockKey)) {
      return res.status(409).json({ success: false, message: 'Another payment transaction is already in progress for this client' });
    }

    // Check that client is active and approved
    const client = await Client.findOne({ _id: clientId, gymId: gymIdStr, isActive: true, 'membership.requestApproved': true });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found, is deactivated, or is pending approval' });

    // Block renewal/purchase if client has outstanding balance
    const hasOutstandingBalance = client.memberships && client.memberships.some(m => {
      const finalPrice = m.finalPrice || 0;
      const totalPaid = m.totalPaid || 0;
      return (finalPrice - totalPaid) > 0;
    });
    if (hasOutstandingBalance) {
      return res.status(400).json({ success: false, message: 'Cannot renew or purchase a new membership. Please clear your outstanding balance first.' });
    }

    const numAmount = Number(amount) || 0;
    const safePaidAmount = Number(paidAmount) || 0;

    // FIX: Reject $0 payments with no amount
    if (numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero' });
    }

    // 1. Validate Start Date (90 days future)
    if (startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const maxDate = new Date(today);
      maxDate.setDate(today.getDate() + 90);

      const startVal = new Date(startDate);
      startVal.setHours(0, 0, 0, 0);

      if (startVal > maxDate) {
        return res.status(400).json({ success: false, message: 'Start date cannot be more than 90 days in the future' });
      }
    }

    // 2. Validate and Auto-Calculate Due Date & 50% Minimum
    const remainingBalance = Math.max(0, numAmount - safePaidAmount);
    let computedDueDate = null;
    if (remainingBalance > 0) {
      if (safePaidAmount <= 100) {
        return res.status(400).json({ success: false, message: 'You must pay an amount greater than ₹100 for partial payment.' });
      }

      const dueDays = planDetails ? (planDetails.partialPaymentDueDays ?? 15) : 15;
      const startVal = new Date(startDate || Date.now());
      startVal.setHours(0, 0, 0, 0);
      computedDueDate = new Date(startVal);
      computedDueDate.setDate(computedDueDate.getDate() + dueDays);
      computedDueDate.setHours(0, 0, 0, 0);
    }

    // FIX: Idempotency key check (replaces fragile 5-second window)
    if (idempotencyKey) {
      const existingPayment = await Payment.findOne({ idempotencyKey });
      if (existingPayment) {
        // Return the existing payment — idempotent response
        return res.status(200).json({ success: true, data: existingPayment, message: 'Payment already recorded (idempotent)' });
      }
    } else {
      // Fallback: 5-second duplicate prevention for clients without idempotency keys
      const recentPayment = await Payment.findOne({
        clientId: client._id,
        gymId: gymIdStr,
        planId: planId,
        createdAt: { $gt: new Date(Date.now() - 5000) }
      });

      if (recentPayment) {
        return res.status(400).json({ success: false, message: 'Duplicate payment detected. Please wait.' });
      }
    }

    const gym = await Gym.findOne({ gymId: gymIdStr });
    const paymentId = await generatePaymentId(gymIdStr, gym.billingInfo?.billingIdPrefix || 'BILL');

    // Status logic for the Payment record itself
    let paymentStatus = 'pending';
    if (safePaidAmount >= numAmount) paymentStatus = 'paid';
    else if (safePaidAmount > 0) paymentStatus = 'partial';

    if (gym && gym.billingInfo?.allowPartialPayments === false && safePaidAmount < numAmount) {
      return res.status(400).json({ success: false, message: 'Partial payments are disabled. Payment must be made in full.' });
    }

    // Create/Update membership in client document
    let activatedPlan = await assignOrRenewPlan(client, planId, startDate, {
      amount: numAmount,
      paidAmount: safePaidAmount,
      dueDate: computedDueDate
    });

    const payment = await Payment.create({
      paymentId,
      idempotencyKey: idempotencyKey || undefined,
      gymId: gymIdStr,
      clientId: client._id,
      clientName: client.personalInfo.name,
      planId,
      planName: planName || activatedPlan.planName, 
      amount: numAmount,
      paidAmount: safePaidAmount,
      invoiceAmount: numAmount,
      paidNow: safePaidAmount,
      totalPaid: safePaidAmount,
      remainingBalance: Math.max(0, numAmount - safePaidAmount),
      status: paymentStatus,
      paymentMethod,
      mode: paymentMethod,
      paymentDate: new Date(),
      dueDate: computedDueDate,
      startDate: activatedPlan.startDate,
      isPlanActivated: true,
      date: new Date(),
      billSentViaWhatsApp: false,
      razorpay_payment_id: razorpay_payment_id || null
    });

    // Reset reminder flags and set overdueReminders
    client.expiryReminderSent = false;
    client.expiredReminderSent = false;
    client.expiryReminderStatus = 'none';
    client.expiredReminderStatus = 'none';
    client.expiryReminderError = null;
    client.expiredReminderError = null;
    client.expiryReminderSentAt = null;
    client.expiredReminderSentAt = null;
    if (client.membership) {
      client.membership.expiryReminderSent = false;
      client.membership.expiredReminderSent = false;
      client.membership.expiryReminderStatus = 'none';
      client.membership.expiredReminderStatus = 'none';
      client.membership.expiryReminderError = null;
      client.membership.expiredReminderError = null;
      client.membership.expiryReminderSentAt = null;
      client.membership.expiredReminderSentAt = null;
    }

    client.overdueReminders = {
      reminder1: { status: 'none', sentAt: null, error: null },
      reminder2: { status: 'none', sentAt: null, error: null },
      reminder3: { status: 'none', sentAt: null, error: null },
      manualReminders: [],
      workflowCompleted: (safePaidAmount >= numAmount)
    };

    if (safePaidAmount < numAmount) client.hasPartialPayment = true;

    client.paymentHistory.push(payment._id);
    await client.save();

    // FIX: Send Bill via WhatsApp — only mark as sent AFTER successful delivery
    const billMessage = `Hello ${client.personalInfo.name}, your payment of ₹${safePaidAmount} for ${activatedPlan.planName} is received. Receipt No: ${paymentId}. Regards, ${gym.billingInfo?.regards || gym.gymName}`;
    try {
      const whatsappResult = await sendWhatsApp({ phone: client.personalInfo.mobileNo, message: billMessage });
      if (whatsappResult && whatsappResult.success) {
        payment.billSentViaWhatsApp = true;
        await payment.save();
      }
    } catch (whatsappErr) {
      console.error('WhatsApp bill send failed:', whatsappErr);
      // Payment is still valid — just bill wasn't sent
    }

    await syncClientStatus(client._id);

    res.status(201).json({ success: true, data: payment });
  } catch (err) {
    next(err);
  } finally {
    if (lockKey) releaseLock(lockKey);
  }
};

// @desc    Get all payments for a gym
// @route   GET /api/payment
// @access  Private (Owner, Admin)
exports.getPayments = async (req, res, next) => {
  try {
    let gymIdStr = req.userRole === 'owner' ? req.user.gymId : req.query.gymId;
    const rawPayments = await Payment.find({ gymId: gymIdStr }).sort({ createdAt: -1 });
    
    // On-the-fly migration for old records — persist corrections to DB
    const bulkOps = [];
    const payments = rawPayments.map(p => {
      const obj = p.toObject ? p.toObject() : p;
      let needsUpdate = false;

      // If amount is 0 (old installment logic) and invoiceAmount is missing
      if ((obj.amount === 0 || !obj.invoiceAmount) && obj.paidAmount > 0) {
        if (!obj.invoiceAmount) { obj.invoiceAmount = obj.amount || obj.paidAmount; needsUpdate = true; }
        if (!obj.paidNow) { obj.paidNow = obj.paidAmount; needsUpdate = true; }
        if (!obj.totalPaid) { obj.totalPaid = obj.paidAmount; needsUpdate = true; }
        if (obj.remainingBalance === undefined) { obj.remainingBalance = Math.max(0, obj.invoiceAmount - obj.totalPaid); needsUpdate = true; }
      }

      // FIX: Persist the migration to DB so we don't redo it every request
      if (needsUpdate) {
        bulkOps.push({
          updateOne: {
            filter: { _id: obj._id },
            update: {
              $set: {
                invoiceAmount: obj.invoiceAmount,
                paidNow: obj.paidNow,
                totalPaid: obj.totalPaid,
                remainingBalance: obj.remainingBalance
              }
            }
          }
        });
      }

      return obj;
    });

    // Persist migrations in background (non-blocking)
    if (bulkOps.length > 0) {
      Payment.bulkWrite(bulkOps).catch(err => console.error('Migration bulkWrite error:', err));
    }

    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (err) {
    next(err);
  }
};

// @desc    Update a payment (partial payments)
// @route   PUT /api/payment/:id
// @access  Private (Owner)
exports.updatePayment = async (req, res, next) => {
  let lockKey = null;
  const { acquireLock, releaseLock } = require('../utils/lock');

  try {
    const { id } = req.params;
    const { additionalAmount, paymentMethod, razorpay_payment_id } = req.body;
    const gymIdStr = req.user.gymId;

    const payment = await Payment.findOne({ _id: id, gymId: gymIdStr });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    lockKey = `payment-${payment.clientId.toString()}`;
    if (!acquireLock(lockKey)) {
      return res.status(409).json({ success: false, message: 'Another payment transaction is already in progress for this client' });
    }

    // Secure client requests: check payment ownership
    if (req.userRole === 'client' && payment.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to payment record' });
    }

    // Verify Razorpay signature for clients online payments
    if (req.userRole === 'client' && (paymentMethod === 'upi' || paymentMethod === 'card')) {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Razorpay payment parameters are missing' });
      }

      const keySecret = process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.trim() : '';
      if (!keySecret) {
        return res.status(500).json({ success: false, message: 'Razorpay integration is not configured on the server.' });
      }

      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', keySecret);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Payment signature verification failed' });
      }
    }

    // FIX: Verify the payment belongs to this gym (already done above via gymId filter)

    const addedAmount = Number(additionalAmount) || 0;
    if (addedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Additional amount must be greater than zero' });
    }

    // 1. Generate new Payment ID for this transaction
    const gym = await Gym.findOne({ gymId: gymIdStr });
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });
    
    const newPaymentId = await generatePaymentId(gymIdStr, gym.billingInfo?.billingIdPrefix || 'BILL');

    const invAmt = payment.invoiceAmount || payment.amount || 0;

    // 2. Compute TRUE cumulative paid by summing paidNow across ALL related transactions
    const allRelated = await Payment.find({
      gymId: gymIdStr,
      clientId: payment.clientId,
      planId: payment.planId,
      startDate: payment.startDate
    });
    const actualPrevTotalPaid = allRelated.reduce((sum, p) => sum + (p.paidNow || p.paidAmount || 0), 0);

    const outstandingBalance = Math.max(0, invAmt - actualPrevTotalPaid);
    if (addedAmount < outstandingBalance) {
      return res.status(400).json({ success: false, message: 'Partial payments are disabled for balance payments. You must pay the full remaining balance.' });
    }

    const currentTotalPaid = actualPrevTotalPaid + addedAmount;
    const currentBalance = Math.max(0, invAmt - currentTotalPaid);
    const newStatus = currentBalance === 0 ? 'paid' : 'partial';

    if (gym.billingInfo?.allowPartialPayments === false && currentBalance > 0) {
      return res.status(400).json({ success: false, message: 'Partial payments are disabled. Remaining balance must be paid in full.' });
    }

    // 3. Create a NEW immutable payment record (installment snapshot)
    const newTransaction = await Payment.create({
      paymentId: newPaymentId,
      gymId: gymIdStr,
      clientId: payment.clientId,
      clientName: payment.clientName,
      planId: payment.planId,
      planName: payment.planName,
      amount: invAmt,
      paidAmount: addedAmount,
      invoiceAmount: invAmt,
      paidNow: addedAmount,
      totalPaid: currentTotalPaid,
      remainingBalance: currentBalance,
      status: newStatus,
      paymentMethod: paymentMethod || payment.paymentMethod || 'cash',
      mode: paymentMethod || payment.paymentMethod || 'cash',
      paymentDate: new Date(),
      startDate: payment.startDate,
      dueDate: currentBalance === 0 ? null : payment.dueDate,
      isPlanActivated: false,
      date: new Date(),
      razorpay_payment_id: razorpay_payment_id || null
    });

    // 4. Sync back to client document
    const client = await Client.findById(payment.clientId);
    if (client) {
      if (!client.paymentHistory) client.paymentHistory = [];
      client.paymentHistory.push(newTransaction._id);

      if (client.memberships && Array.isArray(client.memberships)) {
        const mIdx = client.memberships.findIndex(m =>
          m.planId && payment.planId &&
          m.planId.toString() === payment.planId.toString() &&
          new Date(m.startDate).getTime() === new Date(payment.startDate).getTime()
        );

        if (mIdx !== -1) {
          client.memberships[mIdx].totalPaid = currentTotalPaid;
          if (currentBalance === 0) {
            client.memberships[mIdx].dueDate = null;
          }
        }
      }
      client.hasPartialPayment = true;
      if (currentBalance === 0) {
        if (!client.overdueReminders) {
          client.overdueReminders = {
            reminder1: { status: 'none', sentAt: null, error: null },
            reminder2: { status: 'none', sentAt: null, error: null },
            reminder3: { status: 'none', sentAt: null, error: null },
            manualReminders: []
          };
        }
        client.overdueReminders.workflowCompleted = true;
        client.overdueReminders.duesClearedAt = new Date();
      }
      await client.save();
    }

    await syncClientStatus(payment.clientId);

    res.status(200).json({ success: true, data: newTransaction });
  } catch (err) {
    console.error("UPDATE PAYMENT ERROR:", err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  } finally {
    if (lockKey) releaseLock(lockKey);
  }
};

// @desc    Create Razorpay Order
// @route   POST /api/payment/create-order
// @access  Private (Client, Owner)
exports.createRazorpayOrder = async (req, res, next) => {
  try {
    const { planId, paidAmount, paymentId, additionalAmount } = req.body;
    let gymIdStr = req.user.gymId;
    let finalAmountToPay = 0;

    const gym = await Gym.findOne({ gymId: gymIdStr });
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    if (paymentId) {
      // Dues payment
      const payment = await Payment.findOne({ _id: paymentId, gymId: gymIdStr });
      if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found' });

      // Secure client requests: check payment ownership
      if (req.userRole === 'client' && payment.clientId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Unauthorized access to payment record' });
      }

      const invAmt = payment.invoiceAmount || payment.amount || 0;

      // Compute TRUE cumulative paid
      const allRelated = await Payment.find({
        gymId: gymIdStr,
        clientId: payment.clientId,
        planId: payment.planId,
        startDate: payment.startDate
      });
      const actualPrevTotalPaid = allRelated.reduce((sum, p) => sum + (p.paidNow || p.paidAmount || 0), 0);
      const outstandingBalance = Math.max(0, invAmt - actualPrevTotalPaid);

      const requestedAmt = Number(additionalAmount) || 0;
      if (requestedAmt <= 0) {
        return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero' });
      }
      if (requestedAmt > outstandingBalance) {
        return res.status(400).json({ success: false, message: `Payment exceeds outstanding balance of ₹${outstandingBalance}` });
      }
      if (gym.billingInfo?.allowPartialPayments === false && requestedAmt < outstandingBalance) {
        return res.status(400).json({ success: false, message: 'Partial payments are disabled. Remaining balance must be paid in full.' });
      }
      finalAmountToPay = requestedAmt;
    } else if (planId) {
      // New plan/Renewal payment
      const Plan = require('../models/Plan');
      const planDetails = await Plan.findOne({ _id: planId, gymId: gymIdStr, isActive: true });
      if (!planDetails) {
        return res.status(400).json({ success: false, message: 'Selected plan not found or is inactive' });
      }

      const requestedPaid = Number(paidAmount) || 0;
      if (requestedPaid <= 0) {
        return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero' });
      }
      if (requestedPaid > planDetails.price) {
        return res.status(400).json({ success: false, message: 'Paid amount cannot exceed plan price' });
      }
      if (gym.billingInfo?.allowPartialPayments === false && requestedPaid < planDetails.price) {
        return res.status(400).json({ success: false, message: 'Partial payments are disabled. Payment must be made in full.' });
      }
      finalAmountToPay = requestedPaid;
    } else {
      return res.status(400).json({ success: false, message: 'Plan ID or Payment ID is required' });
    }

    if (!razorpay) {
      return res.status(500).json({ success: false, message: 'Razorpay integration is not configured on the server.' });
    }

    const options = {
      amount: Math.round(finalAmountToPay * 100), // in paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    next(err);
  }
};

