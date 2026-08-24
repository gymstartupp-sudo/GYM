const Client = require('../models/Client');
const Gym = require('../models/Gym');
const Payment = require('../models/Payment');
const { generateClientId, generatePaymentId } = require('../utils/generateId');
const Plan = require('../models/Plan');
const { buildMembershipWindow } = require('../utils/membership');
const metaWhatsAppService = require('../services/metaWhatsAppService');

// @desc    Get all clients for gym
// @route   GET /api/client
// @access  Private (Owner, Admin)
// Helper to calculate balances for all memberships of a client based on payment records
const calculateBalances = (clientDoc, preFetchedPayments = []) => {
  const client = clientDoc.toObject ? clientDoc.toObject() : clientDoc;
  
  // Filter payments for this specific client
  const clientPayments = preFetchedPayments.filter(p => p.clientId?.toString() === client._id.toString());

  // Attach full payment objects to paymentHistory, sorted by newest first
  client.paymentHistory = clientPayments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (client.memberships && Array.isArray(client.memberships)) {
    client.memberships = client.memberships.map(m => {
      // Find all payments belonging to this membership period
      const relatedPayments = clientPayments.filter(p => {
        const mPlanId = m.planId ? m.planId.toString() : null;
        const pPlanId = p.planId ? p.planId.toString() : null;
        if (mPlanId !== pPlanId) return false;

        if (p.startDate && m.startDate) {
          return new Date(p.startDate).setHours(0, 0, 0, 0) === new Date(m.startDate).setHours(0, 0, 0, 0);
        }
        return !p.startDate && !m.startDate;
      });

      const totalPaid = relatedPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
      const finalPrice = m.finalPrice || (relatedPayments.length > 0 ? relatedPayments[0].amount : 0);
      const balance = finalPrice - totalPaid;

      const latestPaymentWithDueDate = [...relatedPayments]
        .filter(p => p.dueDate)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      return {
        ...m,
        finalPrice,
        totalPaid,
        balance: Math.max(0, balance),
        dueDate: latestPaymentWithDueDate ? latestPaymentWithDueDate.dueDate : m.dueDate
      };
    });
    
    // Sort memberships: newest first
    client.memberships.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  }
  
  return client;
};

// @desc    Get all clients for gym
// @route   GET /api/client
// @access  Private (Owner, Admin)
// @query   status, planName, plan
exports.getClients = async (req, res, next) => {
  try {
    const { status, planName, plan, reminder } = req.query;
    
    let query = { isActive: true, isDeleted: { $ne: true } };

    if (status && status.toLowerCase() === 'pending') {
      query['membership.requestApproved'] = false;
    } else {
      query['membership.requestApproved'] = true;
    }

    if (status && status.toLowerCase() !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const s = status.toLowerCase();

      if (s === 'active') {
        query.memberships = { 
          $elemMatch: { startDate: { $lte: today }, endDate: { $gte: today } } 
        };
      } else if (s === 'upcoming') {
        query.memberships = { 
          $elemMatch: { startDate: { $gt: today } } 
        };
      } else if (s === 'expiring soon') {
        query.memberships = { 
          $elemMatch: { endDate: { $gte: today, $lte: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000) } } 
        };
      } else if (s === 'dues') {
        query.paymentStatus = { $in: ['overdue', 'partial'] };
      } else if (s === 'pending') {
        // Handled above
      } else if (s === 'expired') {
        query.$and = [
          { 'memberships.0': { $exists: true } },
          { memberships: { $not: { $elemMatch: { endDate: { $gte: today } } } } }
        ];
      }
    }

    const selectedPlan = planName || plan;
    if (selectedPlan && selectedPlan.toLowerCase() !== 'all') {
      query['membership.planName'] = selectedPlan;
    }

    // Reminder status filtering
    if (reminder && reminder.toLowerCase() !== 'all') {
      const r = reminder.toLowerCase();
      if (r === 'reminder_pending') {
        query.$or = [
          { expiryReminderStatus: { $in: ['none', null] } },
          { expiryReminderStatus: { $exists: false } }
        ];
      } else if (r === 'reminder_sent') {
        query.expiryReminderStatus = 'sent';
      } else if (r === 'expired_reminder_sent') {
        query.expiredReminderStatus = 'sent';
      }
    }

    const rawClients = await Client.find(query).sort({ createdAt: -1 }).lean();
    
    // Optimization: Fetch all payments for these clients in one go and build an O(1) Map lookup
    const Payment = require('../models/Payment');
    const clientIds = rawClients.map(c => c._id.toString());
    const allPayments = await Payment.find({ clientId: { $in: clientIds } }).lean();

    const paymentsMap = new Map();
    allPayments.forEach(p => {
      const cId = p.clientId?.toString();
      if (cId) {
        if (!paymentsMap.has(cId)) {
          paymentsMap.set(cId, []);
        }
        paymentsMap.get(cId).push(p);
      }
    });

    const clients = rawClients.map(c => calculateBalances(c, paymentsMap.get(c._id.toString()) || []));

    res.status(200).json({ success: true, count: clients.length, data: clients });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Client Profile (For Client User)
// @route   GET /api/client/profile
// @access  Private (Client)
exports.getClientProfile = async (req, res, next) => {
  try {
    const Payment = require('../models/Payment');
    const Gym = require('../models/Gym');
    const { syncClientStatus } = require('../utils/syncStatus');

    // Run authoritative status sync to ensure membership.status and details are updated
    await syncClientStatus(req.user._id);

    const client = await Client.findById(req.user._id).populate('membership.planId').lean();
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    
    const payments = await Payment.find({ clientId: client._id.toString() }).lean();
    const enriched = calculateBalances(client, payments);
    const gym = await Gym.findOne({ gymId: client.gymId }).select('-password').lean();
    res.status(200).json({ success: true, data: { ...enriched, gym } });
  } catch (err) {
    next(err);
  }
};

const { sanitizePayload } = require('../utils/allowlist');

// @desc    Update Client Profile
// @route   PUT /api/client/profile
// @access  Private (Client)
exports.updateClientProfile = async (req, res, next) => {
  try {
    const ALLOWED_TOP_LEVEL = ['personalInfo'];
    const ALLOWED_PERSONAL_INFO_FIELDS = [
      'name', 'email', 'mobileNo', 'gender', 'dob', 'address',
      'emergencyContact', 'city', 'state', 'pincode', 'bloodGroup',
      'occupation', 'whatsappNumber', 'mobile', 'medicalCondition'
    ];

    const topKeys = Object.keys(req.body || {});
    const invalidTopKeys = topKeys.filter(k => !ALLOWED_TOP_LEVEL.includes(k));
    if (invalidTopKeys.length > 0) {
      return res.status(400).json({ success: false, message: 'Request contains restricted or invalid fields.' });
    }

    const { personalInfo = {} } = req.body;
    const { cleanData, hasInvalidFields } = sanitizePayload(personalInfo, ALLOWED_PERSONAL_INFO_FIELDS);
    if (hasInvalidFields) {
      return res.status(400).json({ success: false, message: 'Request contains restricted or invalid fields.' });
    }

    const clientId = req.user._id.toString();
    const phoneRegex = /^[6-9]\d{9}$/;

    if (cleanData.email) {
      const emailExists = await Client.findOne({ 'personalInfo.email': cleanData.email, _id: { $ne: clientId } });
      if (emailExists) return res.status(400).json({ success: false, message: 'Email already exists', field: 'email' });
    }

    if (cleanData.mobileNo) {
      if (!phoneRegex.test(cleanData.mobileNo)) return res.status(400).json({ success: false, message: 'Enter a valid Indian mobile number', field: 'mobileNo' });
      const mobileExists = await Client.findOne({ 'personalInfo.mobileNo': cleanData.mobileNo, _id: { $ne: clientId } });
      if (mobileExists) return res.status(400).json({ success: false, message: 'Phone number already exists', field: 'mobileNo' });
    }

    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    // Explicitly copy only allowed fields into personalInfo
    const currentPersonalInfo = client.personalInfo ? client.personalInfo.toObject() : {};
    for (const field of ALLOWED_PERSONAL_INFO_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(cleanData, field)) {
        currentPersonalInfo[field] = cleanData[field];
      }
    }
    client.personalInfo = currentPersonalInfo;
    await client.save();

    // Fetch payments before calling calculateBalances to avoid showing zero balances
    const Payment = require('../models/Payment');
    const Gym = require('../models/Gym');
    const payments = await Payment.find({ clientId }).lean();
    const enriched = calculateBalances(client, payments);
    const gym = await Gym.findOne({ gymId: client.gymId }).select('-password').lean();
    res.status(200).json({ success: true, data: { ...enriched, gym } });
  } catch (err) {
    next(err);
  }
};

// @desc    Owner Add Client directly
// @route   POST /api/client
// @access  Private (Owner)
exports.addClient = async (req, res, next) => {
  try {
    const gymIdStr = req.user.gymId;
    const gymNameStr = req.user.gymName;
    const { personalInfo, password, membership, payment } = req.body;

    if (!personalInfo?.email) return res.status(400).json({ success: false, message: 'Email is required' });
    if (!payment) return res.status(400).json({ success: false, message: 'Payment information is mandatory' });

    // Validate DOB (Must be 14-100 years old)
    if (personalInfo?.dob) {
      const today = new Date();
      const birthDate = new Date(personalInfo.dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 14) {
        return res.status(400).json({ success: false, message: 'Client must be at least 14 years old' });
      }
      if (age > 100) {
        return res.status(400).json({ success: false, message: 'Invalid Date of Birth (max 100 years old)' });
      }
    }

    // Validate Start Date (90 days future)
    if (membership?.startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const maxDate = new Date(today);
      maxDate.setDate(today.getDate() + 90);

      const startVal = new Date(membership.startDate);
      startVal.setHours(0, 0, 0, 0);

      if (startVal > maxDate) {
        return res.status(400).json({ success: false, message: 'Start date cannot be more than 90 days in the future' });
      }
    }

    const clientExists = await Client.findOne({
      $or: [
        { 'personalInfo.email': personalInfo.email },
        { 'personalInfo.mobileNo': personalInfo.mobileNo }
      ]
    });
    if (clientExists) {
      const isEmail = clientExists.personalInfo.email === personalInfo.email;
      return res.status(400).json({
        success: false,
        message: isEmail ? 'Client email exists in this gym.' : 'Client mobile number exists in this gym.'
      });
    }

    // Run plan lookup, gym lookup, and client ID generation in parallel
    const isCustom = membership?.planType === 'Custom';
    const [plan, gym, clientId] = await Promise.all([
      isCustom ? Promise.resolve(null) : Plan.findOne({ _id: membership?.planId, isActive: true }),
      Gym.findOne({ gymId: gymIdStr }),
      generateClientId(gymIdStr)
    ]);

    let planName = membership?.planType;
    let planDurationMonths = 1;
    let planId = membership?.planId;
    let planPrice = 0;

    if (isCustom) {
      planDurationMonths = membership.customMonths;
      planId = null;
      planPrice = payment.amount || 0;
    } else {
      if (!plan) return res.status(400).json({ success: false, message: 'Selected plan not found' });
      planName = plan.name;
      planDurationMonths = plan.durationMonths;
      planPrice = plan.price;
    }

    const membershipWindow = buildMembershipWindow({ startDate: membership?.startDate || Date.now(), durationMonths: planDurationMonths });

    const planPriceVal = Number(planPrice) || 0;
    const paidAmountVal = Number(payment.paidAmount) || 0;
    const remainingBalanceVal = Math.max(0, planPriceVal - paidAmountVal);

    let resolvedDueDate = null;
    if (remainingBalanceVal > 0) {
      if (paidAmountVal < 100) {
        return res.status(400).json({ success: false, message: 'Minimum partial payment amount is ₹100.' });
      }
      const dueDays = plan ? (plan.partialPaymentDueDays ?? 15) : 15;
      const startVal = new Date(membership?.startDate || Date.now());
      startVal.setHours(0, 0, 0, 0);
      resolvedDueDate = new Date(startVal);
      resolvedDueDate.setDate(resolvedDueDate.getDate() + dueDays);
      resolvedDueDate.setHours(0, 0, 0, 0);
    }

    const paymentId = await generatePaymentId(gymIdStr, gym?.billingInfo?.billingIdPrefix || 'BILL');

    // Now create the client
    const client = await Client.create({
      clientId, gymId: gymIdStr, gymName: gymNameStr, personalInfo, password,
      avatar: personalInfo.name.charAt(0).toUpperCase(),
      hasPartialPayment: paidAmountVal > 0 && paidAmountVal < planPriceVal,
      paymentStatus: paidAmountVal >= planPriceVal ? 'paid' : (paidAmountVal > 0 ? 'partial' : 'overdue'),
      overdueReminders: {
        reminder1: { status: 'none', sentAt: null, error: null },
        reminder2: { status: 'none', sentAt: null, error: null },
        reminder3: { status: 'none', sentAt: null, error: null },
        manualReminders: [],
        workflowCompleted: (remainingBalanceVal === 0)
      },
      memberships: [{
        planId, planName, planDurationMonths, startDate: membershipWindow.startDate, endDate: membershipWindow.endDate,
        finalPrice: planPrice, totalPaid: payment.paidAmount, dueDate: resolvedDueDate
      }],
      membership: {
        planId, planName, planDurationMonths, durationMonths: planDurationMonths,
        startDate: membershipWindow.startDate, endDate: membershipWindow.endDate, daysLeft: membershipWindow.daysLeft, requestApproved: true
      }
    });

    // ── Create payment record — if this fails, rollback by deleting the client ──
    let paymentRecord;
    try {
      paymentRecord = await Payment.create({
        paymentId, gymId: gymIdStr, clientId: client._id.toString(), clientName: personalInfo.name, planId, planName,
        amount: planPrice, paidAmount: payment.paidAmount,
        invoiceAmount: planPrice,
        paidNow: payment.paidAmount,
        totalPaid: payment.paidAmount,
        remainingBalance: remainingBalanceVal,
        status: paidAmountVal >= planPriceVal ? 'paid' : (paidAmountVal > 0 ? 'partial' : 'overdue'),
        paymentMethod: payment.paymentMethod, dueDate: resolvedDueDate, startDate: membershipWindow.startDate, isPlanActivated: true,
        mode: payment.paymentMethod, date: new Date(), paymentDate: new Date()
      });
    } catch (paymentErr) {
      // Rollback: delete the client since payment failed
      await Client.deleteOne({ _id: client._id });
      throw new Error(`Payment creation failed — client registration has been rolled back. ${paymentErr.message}`);
    }
    // ────────────────────────────────────────────────────────────────────────

    // Respond immediately — paymentHistory link and WhatsApp run in background
    const enriched = calculateBalances(client, [paymentRecord]);
    res.status(201).json({ success: true, data: enriched });

    setImmediate(async () => {
      try {
        await Client.updateOne(
          { _id: client._id },
          { $set: { paymentHistory: [paymentRecord._id] } }
        );
      } catch (err) {
        console.error('Background paymentHistory update error:', err);
      }
      if (gym && gym.dbName) {
        const { sendPaymentNotification } = require('../services/whatsappNotificationService');
        sendPaymentNotification(paymentRecord._id, client._id, gym.gymId, gym.dbName).catch(err => {
          console.error('Error triggering payment notification in createClient:', err);
        });
      }
    });
  } catch (err) {
    next(err);
  }
};



// @desc    Get Client by ID (For Owner)
// @route   GET /api/client/:id
// @access  Private (Owner)
exports.getClientById = async (req, res, next) => {
  try {
    const Payment = require('../models/Payment');
    const clientDoc = await Client.findById(req.params.id).lean();
    if (!clientDoc) return res.status(404).json({ success: false, message: 'Client not found' });
    
    const payments = await Payment.find({ clientId: clientDoc._id.toString() }).lean();
    const enriched = calculateBalances(clientDoc, payments);
    res.status(200).json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

// @desc    Deactivate Client (soft delete)
// @route   PUT /api/client/:id/deactivate
// @access  Private (Owner)
exports.deactivateClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    client.isActive = false;
    client.deactivatedAt = new Date();
    await client.save();
    res.status(200).json({ success: true, message: 'Client deactivated successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete Client Permanently
// @route   DELETE /api/client/:id
// @access  Private (Owner)
exports.deleteClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    
    client.isDeleted = true;
    client.deletedAt = new Date();
    client.deletedBy = req.user?._id || null;
    
    await client.save();
    
    res.status(200).json({ success: true, message: 'Client deleted successfully', data: {} });
  } catch (err) {
    next(err);
  }
};

// @desc    Get inactive clients for gym
// @route   GET /api/client/inactive
// @access  Private (Owner, Admin)
exports.getInactiveClients = async (req, res, next) => {
  try {
    const { status, planName, plan } = req.query;
    
    let query = { isActive: false, isDeleted: { $ne: true }, 'membership.requestApproved': true };

    if (status && status.toLowerCase() !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const s = status.toLowerCase();

      if (s === 'active') {
        query.memberships = { 
          $elemMatch: { startDate: { $lte: today }, endDate: { $gte: today } } 
        };
      } else if (s === 'upcoming') {
        query.memberships = { 
          $elemMatch: { startDate: { $gt: today } } 
        };
      } else if (s === 'expiring soon') {
        query.memberships = { 
          $elemMatch: { endDate: { $gte: today, $lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) } } 
        };
      } else if (s === 'dues') {
        query.paymentStatus = { $in: ['overdue', 'partial'] };
      } else if (s === 'expired') {
        query.memberships = { 
          $elemMatch: { endDate: { $lt: today } } 
        };
      }
    }

    const selectedPlan = planName || plan;
    if (selectedPlan && selectedPlan.toLowerCase() !== 'all') {
      query['membership.planName'] = selectedPlan;
    }

    const rawClients = await Client.find(query).sort({ deactivatedAt: -1 }).lean();
    
    // Optimization: Fetch all payments for these clients in one go and build an O(1) Map lookup
    const Payment = require('../models/Payment');
    const clientIds = rawClients.map(c => c._id.toString());
    const allPayments = await Payment.find({ clientId: { $in: clientIds } }).lean();

    const paymentsMap = new Map();
    allPayments.forEach(p => {
      const cId = p.clientId?.toString();
      if (cId) {
        if (!paymentsMap.has(cId)) {
          paymentsMap.set(cId, []);
        }
        paymentsMap.get(cId).push(p);
      }
    });

    const clients = rawClients.map(c => calculateBalances(c, paymentsMap.get(c._id.toString()) || []));

    res.status(200).json({ success: true, count: clients.length, data: clients });
  } catch (err) {
    console.error("GET INACTIVE CLIENTS ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Reactivate Client
// @route   PUT /api/client/:id/reactivate
// @access  Private (Owner)
exports.reactivateClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    client.isActive = true;
    client.deactivatedAt = null;

    // Reset reminder flags on reactivation
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

    await client.save();
    res.status(200).json({ success: true, data: client });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve Pending Client
// @route   PUT /api/client/:id/approve
// @access  Private (Owner)
exports.approveClient = async (req, res, next) => {
  const { acquireLock, releaseLock } = require('../utils/lock');
  const lockKey = `approve-${req.params.id}`;

  const acquired = await acquireLock(lockKey);
  if (!acquired) {
    return res.status(409).json({ success: false, message: 'Approval request is already in progress for this client' });
  }

  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    if (client.membership && client.membership.requestApproved) {
      return res.status(400).json({ success: false, message: 'Client is already approved' });
    }

    let planName = client.membership.planName;
    let planDurationMonths = client.membership.planDurationMonths || 1;
    let planPrice = 0;

    let plan = null;
    if (client.membership.planId) {
      plan = await Plan.findOne({ _id: client.membership.planId, isActive: true });
      if (plan) {
        planName = plan.name;
        planDurationMonths = plan.durationMonths;
        planPrice = plan.price || 0;
      }
    } else if (client.membership.customMonths) {
      planDurationMonths = client.membership.customMonths;
    }

    const paidAmount = req.body.paidAmount !== undefined ? Number(req.body.paidAmount) : 0;
    const paymentMethod = req.body.paymentMethod || 'cash';
    const startDateVal = req.body.startDate || client.membership.startDate || Date.now();
    const dueDateVal = req.body.dueDate || client.membership.dueDate || null;

    const membershipWindow = buildMembershipWindow({
      startDate: startDateVal,
      durationMonths: planDurationMonths
    });

    if (!client.clientId) {
      client.clientId = await generateClientId(client.gymId);
    }

    // 1. Create a Payment record so there is an audit trail
    const gym = await Gym.findOne({ gymId: client.gymId });
    const paymentId = await generatePaymentId(client.gymId, gym?.billingInfo?.billingIdPrefix || 'BILL');

    const remainingBalance = Math.max(0, planPrice - paidAmount);
    
    // Validate partial payments restriction if disabled
    if (gym?.billingInfo?.allowPartialPayments === false && remainingBalance > 0) {
      return res.status(400).json({ success: false, message: 'Partial payments are disabled. Payment must be made in full.' });
    }

    // Validate Start Date (90 days future)
    const startCheck = new Date(startDateVal);
    startCheck.setHours(0, 0, 0, 0);

    const todayCheck = new Date();
    todayCheck.setHours(0, 0, 0, 0);

    const maxDateCheck = new Date(todayCheck);
    maxDateCheck.setDate(todayCheck.getDate() + 90);

    if (startCheck > maxDateCheck) {
      return res.status(400).json({ success: false, message: 'Start date cannot be more than 90 days in the future' });
    }

    // Validate and Auto-Calculate Due Date & 50% Minimum
    let resolvedDueDate = null;
    if (remainingBalance > 0) {
      if (paidAmount < 100) {
        return res.status(400).json({ success: false, message: 'Minimum partial payment amount is ₹100.' });
      }

      const dueDays = plan ? (plan.partialPaymentDueDays ?? 15) : 15;
      resolvedDueDate = new Date(startCheck);
      resolvedDueDate.setDate(resolvedDueDate.getDate() + dueDays);
      resolvedDueDate.setHours(0, 0, 0, 0);
    }

    const resolvedStatus = paidAmount >= planPrice ? 'paid' : (paidAmount > 0 ? 'partial' : 'overdue');

    const paymentRecord = await Payment.create({
      paymentId,
      gymId: client.gymId,
      clientId: client._id.toString(),
      clientName: client.personalInfo.name,
      planId: client.membership.planId,
      planName,
      amount: planPrice,
      paidAmount,
      invoiceAmount: planPrice,
      paidNow: paidAmount,
      totalPaid: paidAmount,
      remainingBalance,
      status: resolvedStatus,
      paymentMethod,
      startDate: membershipWindow.startDate,
      dueDate: resolvedDueDate,
      isPlanActivated: true,
      mode: paymentMethod,
      date: new Date(),
      paymentDate: new Date()
    });

    // 2. Build the new memberships entry
    const newPlan = {
      planId: client.membership.planId,
      planName,
      planDurationMonths,
      startDate: membershipWindow.startDate,
      endDate: membershipWindow.endDate,
      finalPrice: planPrice,
      totalPaid: paidAmount,
      dueDate: resolvedDueDate
    };

    if (!client.memberships) client.memberships = [];
    client.memberships.push(newPlan);

    client.gymName = req.user.gymName;
    client.isDeleted = false;
    client.deletedAt = null;
    client.deletedBy = null;
    client.membership.requestApproved = true;
    client.membership.startDate = membershipWindow.startDate;
    client.membership.endDate = membershipWindow.endDate;
    client.membership.daysLeft = membershipWindow.daysLeft;
    client.membership.planName = planName;
    client.membership.planDurationMonths = planDurationMonths;
    client.membership.durationMonths = planDurationMonths; // backward compat

    client.hasPartialPayment = remainingBalance > 0;

    client.overdueReminders = {
      reminder1: { status: 'none', sentAt: null, error: null },
      reminder2: { status: 'none', sentAt: null, error: null },
      reminder3: { status: 'none', sentAt: null, error: null },
      manualReminders: [],
      workflowCompleted: (remainingBalance === 0)
    };

    if (!client.paymentHistory) client.paymentHistory = [];
    client.paymentHistory.push(paymentRecord._id);

    await client.save();

    // Sync client status using syncClientStatus utility
    const { syncClientStatus } = require('../utils/syncStatus');
    await syncClientStatus(client._id);

    // Trigger WhatsApp notification with bill PDF in the background
    if (gym && gym.dbName) {
      const { sendPaymentNotification } = require('../services/whatsappNotificationService');
      sendPaymentNotification(paymentRecord._id, client._id, gym.gymId, gym.dbName).catch(err => {
        console.error('Error triggering payment notification in approveClient:', err);
      });
    }

    // Fetch the updated client doc to return enriched with balances
    const updatedClient = await Client.findById(client._id);
    const payments = await Payment.find({ clientId: client._id.toString() }).lean();
    const enriched = calculateBalances(updatedClient, payments);

    res.status(200).json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  } finally {
    await releaseLock(lockKey);
  }
};

// @desc    Change Client Password
// @route   PUT /api/client/change-password
// @access  Private (Client)
exports.changeClientPassword = async (req, res, next) => {
  try {
    const ALLOWED_FIELDS = ['currentPassword', 'newPassword'];
    const { cleanData, hasInvalidFields } = sanitizePayload(req.body, ALLOWED_FIELDS);
    if (hasInvalidFields) {
      return res.status(400).json({ success: false, message: 'Request contains restricted or invalid fields.' });
    }

    const { currentPassword, newPassword } = cleanData;

    // Validate password strength: min 8 characters, at least 1 uppercase and 1 number
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).+$/;
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8 || !passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with 1 uppercase and 1 number',
        field: 'newPassword'
      });
    }

    const client = await Client.findById(req.user._id);

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const isMatch = await client.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    client.password = newPassword;
    await client.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Send manual payment reminder via WhatsApp
// @route   POST /api/client/:id/send-reminder
// @access  Private (Owner)
exports.sendManualReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const gym = await Gym.findOne({ owner: req.user._id });
    const gymName = gym?.gymName || 'Your Gym';

    const membership = client.memberships?.[0] || client.membership;
    const finalPrice = Number(membership?.finalPrice || 0);
    const totalPaid = Number(membership?.totalPaid || membership?.paidAmount || 0);
    const balance = finalPrice - totalPaid;

    if (balance <= 0) {
      return res.status(400).json({ success: false, message: 'Client has no pending balance' });
    }

    const planName = membership?.planName || 'No Plan';
    const dueDate = membership?.dueDate
      ? new Date(membership.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-')
      : 'N/A';

    const clientName = client.personalInfo?.name || 'Client';
    const phone = client.personalInfo?.mobileNo || client.whatsappNumber;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'No phone number found for this client' });
    }

    const message = `Dear ${clientName},

Your pending membership payment of ₹${balance} is now overdue.

Plan: ${planName}
Original Due Date: ${dueDate}
Gym: ${gymName}

Please clear the pending balance as soon as possible to continue your membership without interruption.

Thank you.`;

    // Calculate daysUntilDue dynamically
    let stage = 3;
    let reminderKey = 'reminder3';
    let reminderType = 'Due Reminder 3';
    let templateName = process.env.META_TEMPLATE_DUE_THIRD || 'due_third_reminder';

    if (membership?.dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const normalizedToday = new Date(today);
      const normalizedDueDate = new Date(membership.dueDate);
      normalizedDueDate.setHours(0, 0, 0, 0);
      const diffTime = normalizedDueDate.getTime() - normalizedToday.getTime();
      const daysUntilDue = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (daysUntilDue > 0) {
        stage = 1;
        reminderKey = 'reminder1';
        reminderType = 'Due Reminder 1';
        templateName = process.env.META_TEMPLATE_DUE_FIRST || 'due_first_reminder';
      } else if (daysUntilDue <= 0 && daysUntilDue > -3) {
        stage = 2;
        reminderKey = 'reminder2';
        reminderType = 'Due Reminder 2';
        templateName = process.env.META_TEMPLATE_DUE_SECOND || 'due_second_reminder';
      }
    }

    const paymentLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/client/renew/${client.clientId}?balance=true`;
    const result = await metaWhatsAppService.sendDueReminder({
      phone,
      clientName,
      gymName: client.gymName || gym?.gymName || 'Gym',
      pendingAmount: balance,
      dueDate,
      clientId: client.clientId,
      gymId: gym?.gymId,
      stage
    });

    // Initialize overdueReminders if needed
    if (!client.overdueReminders) {
      client.overdueReminders = {
        reminder1: { status: 'none', sentAt: null, error: null },
        reminder2: { status: 'none', sentAt: null, error: null },
        reminder3: { status: 'none', sentAt: null, error: null },
        manualReminders: [],
        workflowCompleted: false
      };
    }
    if (!client.overdueReminders.manualReminders) {
      client.overdueReminders.manualReminders = [];
    }

    const manualSentCount = client.overdueReminders.manualReminders.filter(
      r => r.status === 'sent' && r.executionSource === 'Manual Reminder'
    ).length;

    if (manualSentCount >= 2) {
      return res.status(400).json({ success: false, message: 'Overdue reminder limit reached (Maximum 2 reminders)' });
    }

    if (result && result.success) {
      client.overdueReminders.manualReminders.push({
        sentAt: new Date(),
        status: 'sent',
        error: null,
        reminderType,
        templateName,
        executionSource: 'Manual Reminder',
        messageId: result.messageId,
        sentBy: 'Gym Owner'
      });
      await client.save();
      res.status(200).json({ success: true, message: 'Reminder sent successfully' });
    } else {
      client.overdueReminders.manualReminders.push({
        sentAt: new Date(),
        status: 'failed',
        error: result?.error || 'Unknown error',
        reminderType,
        templateName,
        executionSource: 'Manual Reminder',
        messageId: null,
        sentBy: 'Gym Owner'
      });
      await client.save();
      res.status(500).json({ success: false, message: 'Failed to send reminder', error: result?.error });
    }
  } catch (err) {
    next(err);
  }
};

exports.sendOverdueReminder = exports.sendManualReminder;

// @desc    Get soft deleted clients for gym
// @route   GET /api/client/deleted
// @access  Private (Owner, Admin)
exports.getDeletedClients = async (req, res, next) => {
  try {
    const rawClients = await Client.find({ isDeleted: true }).sort({ deletedAt: -1 }).lean();
    
    const Payment = require('../models/Payment');
    const clientIds = rawClients.map(c => c._id.toString());
    const allPayments = await Payment.find({ clientId: { $in: clientIds } }).lean();

    const paymentsMap = new Map();
    allPayments.forEach(p => {
      const cId = p.clientId?.toString();
      if (cId) {
        if (!paymentsMap.has(cId)) {
          paymentsMap.set(cId, []);
        }
        paymentsMap.get(cId).push(p);
      }
    });

    const clients = rawClients.map(c => calculateBalances(c, paymentsMap.get(c._id.toString()) || []));
    res.status(200).json({ success: true, count: clients.length, data: clients });
  } catch (err) {
    next(err);
  }
};

exports.restoreClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    
    const { membership, payment } = req.body || {};
    if (membership && payment) {
      const Plan = require('../models/Plan');
      const Gym = require('../models/Gym');
      const Payment = require('../models/Payment');
      const { generatePaymentId } = require('../utils/generateId');
      const { buildMembershipWindow } = require('../utils/membership');
      const { syncClientStatus } = require('../utils/syncStatus');

      let planName = membership.planType;
      let planDurationMonths = 1;
      let planId = membership.planId;
      let planPrice = 0;

      let plan = null;
      if (membership.planType === 'Custom') {
        planDurationMonths = membership.customMonths || 1;
        planId = null;
        planPrice = payment.amount || 0;
      } else {
        plan = await Plan.findOne({ _id: membership.planId, isActive: true });
        if (!plan) return res.status(400).json({ success: false, message: 'Selected plan not found' });
        planName = plan.name;
        planDurationMonths = plan.durationMonths;
        planPrice = plan.price;
      }

      const planPriceVal = Number(planPrice) || 0;
      const paidAmountVal = Number(payment.paidAmount) || 0;
      const remainingBalanceVal = Math.max(0, planPriceVal - paidAmountVal);

      let resolvedDueDate = null;
      if (remainingBalanceVal > 0) {
        if (paidAmountVal < 100) {
          return res.status(400).json({ success: false, message: 'Minimum partial payment amount is ₹100.' });
        }
        const dueDays = plan ? (plan.partialPaymentDueDays ?? 15) : 15;
        const startVal = new Date(membership.startDate || Date.now());
        startVal.setHours(0, 0, 0, 0);
        resolvedDueDate = new Date(startVal);
        resolvedDueDate.setDate(resolvedDueDate.getDate() + dueDays);
        resolvedDueDate.setHours(0, 0, 0, 0);
      }

      const gym = await Gym.findOne({ gymId: client.gymId });
      const paymentId = await generatePaymentId(client.gymId, gym?.billingInfo?.billingIdPrefix || 'BILL');
      const membershipWindow = buildMembershipWindow({ startDate: membership.startDate || Date.now(), durationMonths: planDurationMonths });

      client.isDeleted = false;
      client.deletedAt = null;
      client.deletedBy = null;
      client.isActive = true;
      client.deactivatedAt = null;
      client.hasPartialPayment = paidAmountVal > 0 && paidAmountVal < planPriceVal;
      client.paymentStatus = paidAmountVal >= planPriceVal ? 'paid' : (paidAmountVal > 0 ? 'partial' : 'overdue');
      
      client.overdueReminders = {
        reminder1: { status: 'none', sentAt: null, error: null },
        reminder2: { status: 'none', sentAt: null, error: null },
        reminder3: { status: 'none', sentAt: null, error: null },
        manualReminders: [],
        workflowCompleted: (remainingBalanceVal === 0)
      };

      if (!client.memberships) client.memberships = [];
      const newPlan = {
        planId, planName, planDurationMonths, startDate: membershipWindow.startDate, endDate: membershipWindow.endDate,
        finalPrice: planPrice, totalPaid: payment.paidAmount, dueDate: resolvedDueDate
      };
      client.memberships.push(newPlan);
      client.membership = {
        planId, planName, planDurationMonths, durationMonths: planDurationMonths,
        startDate: membershipWindow.startDate, endDate: membershipWindow.endDate, daysLeft: membershipWindow.daysLeft, requestApproved: true
      };

      await client.save();

      const paymentRecord = await Payment.create({
        paymentId, gymId: client.gymId, clientId: client._id.toString(), clientName: client.personalInfo.name, planId, planName,
        amount: planPrice, paidAmount: payment.paidAmount,
        invoiceAmount: planPrice,
        paidNow: payment.paidAmount,
        totalPaid: payment.paidAmount,
        remainingBalance: remainingBalanceVal,
        status: paidAmountVal >= planPriceVal ? 'paid' : (paidAmountVal > 0 ? 'partial' : 'overdue'),
        paymentMethod: payment.paymentMethod, dueDate: resolvedDueDate, startDate: membershipWindow.startDate, isPlanActivated: true,
        mode: payment.paymentMethod, date: new Date(), paymentDate: new Date()
      });

      client.paymentHistory.push(paymentRecord._id);
      await client.save();
      await syncClientStatus(client._id);

      // Trigger WhatsApp notification with bill PDF in the background
      if (gym && gym.dbName) {
        const { sendPaymentNotification } = require('../services/whatsappNotificationService');
        sendPaymentNotification(paymentRecord._id, client._id, gym.gymId, gym.dbName).catch(err => {
          console.error('Error triggering payment notification in reactivateClient:', err);
        });
      }
    } else {
      client.isDeleted = false;
      client.deletedAt = null;
      client.deletedBy = null;
      client.isActive = true;
      client.deactivatedAt = null;
      await client.save();
      const { syncClientStatus } = require('../utils/syncStatus');
      await syncClientStatus(client._id);
    }
    
    const sanitizedClient = client.toObject ? client.toObject() : { ...client };
    delete sanitizedClient.password;

    res.status(200).json({ success: true, message: 'Client restored successfully', data: sanitizedClient });
  } catch (err) {
    next(err);
  }
};

exports.restoreClientByContact = async (req, res, next) => {
  try {
    const { email, phone } = req.body || {};
    if (!email && !phone) {
      return res.status(400).json({ success: false, message: 'Email or phone number is required to restore client' });
    }

    const query = email ? { 'personalInfo.email': email } : { 'personalInfo.mobileNo': phone };
    const client = await Client.findOne(query);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    req.params.id = client._id.toString();
    return exports.restoreClient(req, res, next);
  } catch (err) {
    next(err);
  }
};

