const Payment = require('../models/Payment');
const Client = require('../models/Client');
const Gym = require('../models/Gym');
const { generatePaymentId } = require('../utils/generateId');
const sendWhatsApp = require('../utils/sendWhatsApp');
const { buildMembershipWindow } = require('../utils/membership');
const { syncClientStatus } = require('../utils/syncStatus');

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
  try {
    const { clientId, planId, planName, amount, paidAmount = 0, paymentMethod = 'cash', dueDate, startDate } = req.body;
    const gymIdStr = req.user.gymId;

    if (!planId) return res.status(400).json({ success: false, message: 'Plan is required for payment' });

    const client = await Client.findOne({ _id: clientId, gymId: gymIdStr });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    // Duplicate prevention: Check if a similar payment was recorded in the last 5 seconds
    const recentPayment = await Payment.findOne({
      clientId: client._id,
      gymId: gymIdStr,
      planId: planId,
      createdAt: { $gt: new Date(Date.now() - 5000) }
    });

    if (recentPayment) {
      return res.status(400).json({ success: false, message: 'Duplicate payment detected. Please wait.' });
    }

    const gym = await Gym.findOne({ gymId: gymIdStr });
    const paymentId = await generatePaymentId(gymIdStr, gym.billingInfo?.billingIdPrefix || 'BILL');

    const numAmount = Number(amount) || 0;
    const safePaidAmount = Number(paidAmount) || 0;
    
    // Status logic for the Payment record itself
    let paymentStatus = 'pending';
    if (safePaidAmount >= numAmount) paymentStatus = 'paid';
    else if (safePaidAmount > 0) paymentStatus = 'partial';

    const computedDueDate = dueDate ? new Date(dueDate) : null;

    // Create/Update membership in client document
    let activatedPlan = await assignOrRenewPlan(client, planId, startDate, {
      amount: numAmount,
      paidAmount: safePaidAmount,
      dueDate: computedDueDate
    });

    const payment = await Payment.create({
      paymentId,
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
      billSentViaWhatsApp: false
    });

    client.paymentHistory.push(payment._id);
    await client.save();

    // Send Bill via WhatsApp
    payment.billSentViaWhatsApp = true;
    await payment.save();

    const billMessage = `Hello ${client.personalInfo.name}, your payment of ₹${safePaidAmount} for ${activatedPlan.planName} is received. Receipt No: ${paymentId}. Regards, ${gym.billingInfo?.regards || gym.gymName}`;
    sendWhatsApp({ phone: client.personalInfo.mobileNo, message: billMessage }).catch(console.error);

    await syncClientStatus(client._id);

    res.status(201).json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all payments for a gym
// @route   GET /api/payment
// @access  Private (Owner, Admin)
exports.getPayments = async (req, res, next) => {
  try {
    let gymIdStr = req.userRole === 'owner' ? req.user.gymId : req.query.gymId;
    const rawPayments = await Payment.find({ gymId: gymIdStr }).sort({ createdAt: -1 });
    
    // On-the-fly migration for old records
    const payments = rawPayments.map(p => {
      const obj = p.toObject();
      // If amount is 0 (old installment logic) and invoiceAmount is missing
      if ((obj.amount === 0 || !obj.invoiceAmount) && obj.paidAmount > 0) {
        // Try to reconstruct based on available data
        // For display purposes, we'll try to find the anchor if needed, 
        // but for now, we'll just ensure it doesn't show 0 if it's meant to be an invoice
        if (!obj.invoiceAmount) obj.invoiceAmount = obj.amount || obj.paidAmount;
        if (!obj.paidNow) obj.paidNow = obj.paidAmount;
        if (!obj.totalPaid) obj.totalPaid = obj.paidAmount;
        if (obj.remainingBalance === undefined) obj.remainingBalance = Math.max(0, obj.invoiceAmount - obj.totalPaid);
      }
      return obj;
    });

    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (err) {
    next(err);
  }
};

// @desc    Update a payment (partial payments)
// @route   PUT /api/payment/:id
// @access  Private (Owner)
exports.updatePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { additionalAmount } = req.body;
    const gymIdStr = req.user.gymId;

    const payment = await Payment.findOne({ _id: id, gymId: gymIdStr });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

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
    //    (same client, same plan, same subscription start date)
    //    This ensures each installment record stays an immutable snapshot and is not
    //    mutated when a subsequent payment is recorded.
    const allRelated = await Payment.find({
      gymId: gymIdStr,
      clientId: payment.clientId,
      planId: payment.planId,
      startDate: payment.startDate
    });
    const actualPrevTotalPaid = allRelated.reduce((sum, p) => sum + (p.paidNow || 0), 0);

    const currentTotalPaid = actualPrevTotalPaid + addedAmount;
    const currentBalance = Math.max(0, invAmt - currentTotalPaid);
    const newStatus = currentBalance === 0 ? 'paid' : 'partial';

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
      paymentMethod: payment.paymentMethod || 'cash',
      mode: payment.paymentMethod || 'cash',
      paymentDate: new Date(),
      startDate: payment.startDate,
      dueDate: payment.dueDate,
      isPlanActivated: false,
      date: new Date()
    });

    // 4. Each payment row is a FULLY IMMUTABLE snapshot.
    //    Previous rows keep their original totalPaid, balance, and status.
    //    Only the NEW transaction record carries the correct cumulative state.

    // 5. Sync back to client document
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
          if (client.membership && client.membership.planId && payment.planId &&
              client.membership.planId.toString() === payment.planId.toString()) {
            client.membership.totalPaid = currentTotalPaid;
          }
        }
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
  }
};


