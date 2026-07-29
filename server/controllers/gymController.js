const Gym = require('../models/Gym');
const Client = require('../models/Client');
const Plan = require('../models/Plan');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const { isValidExternalUrl } = require('../middleware/validate');

// @desc    Get Gym Profile
// @route   GET /api/gym/profile
// @access  Private (Owner)
exports.getGymProfile = async (req, res, next) => {
  try {
    let gym;
    if (req.userRole === 'superadmin' && req.user.gymId) {
      gym = await Gym.findOne({ gymId: req.user.gymId }).select('-password');
    } else {
      const gymStrId = req.user._id.toString();
      gym = await Gym.findById(gymStrId).select('-password');
    }
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    const owner = gym.owner ? {
      name: gym.owner.name,
      mobileNo: gym.owner.mobile || gym.owner.phone,
      mailId: gym.owner.email
    } : null;

    res.status(200).json({ success: true, data: { gym, owner } });
  } catch (err) {
    next(err);
  }
};

const { sanitizePayload } = require('../utils/allowlist');

// @desc    Update Gym Profile
// @route   PUT /api/gym/profile
// @access  Private (Owner)
exports.updateGymProfile = async (req, res, next) => {
  try {
    const ALLOWED_TOP_LEVEL = ['gymData', 'ownerData'];
    const ALLOWED_GYM_FIELDS = [
      'gymName', 'gymEmail', 'gymContact', 'address', 'city', 'state',
      'pincode', 'gst', 'gymLogo', 'tagline', 'gymType', 'operatingDays',
      'operatingHours', 'billingInfo', 'reminderSettings', 'socialMediaLinks'
    ];
    const ALLOWED_OWNER_FIELDS = ['name', 'email', 'mobile', 'phone', 'mobileNo', 'mailId'];

    // 1. Verify Top-Level Keys
    const topKeys = Object.keys(req.body || {});
    const invalidTopKeys = topKeys.filter(k => !ALLOWED_TOP_LEVEL.includes(k));
    if (invalidTopKeys.length > 0) {
      return res.status(400).json({ success: false, message: 'Request contains restricted or invalid fields.' });
    }

    const { gymData, ownerData } = req.body;
    const gymStrId = req.user._id.toString();
    const phoneRegex = /^[6-9]\d{9}$/;

    let cleanGymData = null;
    let cleanOwnerData = null;

    // ─── 1. Gym Data Checks & Sanitization ───────────────────────────────────
    if (gymData) {
      const { cleanData, hasInvalidFields } = sanitizePayload(gymData, ALLOWED_GYM_FIELDS);
      if (hasInvalidFields) {
        return res.status(400).json({ success: false, message: 'Request contains restricted or invalid fields.' });
      }
      cleanGymData = cleanData;

      if (cleanGymData.gymName && cleanGymData.gymName.length > 25) {
        return res.status(400).json({ success: false, message: 'Gym name cannot exceed 25 characters', field: 'gymName' });
      }

      // Duplicate Email Check
      if (cleanGymData.gymEmail) {
        const emailExists = await Gym.findOne({ gymEmail: cleanGymData.gymEmail, _id: { $ne: gymStrId } });
        if (emailExists) return res.status(400).json({ success: false, message: 'Email already exists', field: 'gymEmail' });
      }

      // Duplicate Contact Check
      if (cleanGymData.gymContact) {
        if (!phoneRegex.test(cleanGymData.gymContact)) {
          return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number', field: 'gymContact' });
        }
        const contactExists = await Gym.findOne({ gymContact: cleanGymData.gymContact, _id: { $ne: gymStrId } });
        if (contactExists) return res.status(400).json({ success: false, message: 'Phone number already exists', field: 'gymContact' });
      }

      if (cleanGymData.reminderSettings) {
        const { whatsappNumber, phoneNumber } = cleanGymData.reminderSettings;
        if (whatsappNumber && !phoneRegex.test(whatsappNumber)) {
          return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number', field: 'whatsapp' });
        }
        if (phoneNumber && !phoneRegex.test(phoneNumber)) {
          return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number', field: 'smsPhone' });
        }
      }

      if (cleanGymData.billingInfo) {
        const { helpContact } = cleanGymData.billingInfo;
        if (helpContact && !phoneRegex.test(helpContact)) {
          return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number', field: 'billHelp' });
        }
      }

      if (cleanGymData.socialMediaLinks) {
        if (!Array.isArray(cleanGymData.socialMediaLinks)) {
          return res.status(400).json({ success: false, message: 'socialMediaLinks must be an array' });
        }
        for (const item of cleanGymData.socialMediaLinks) {
          if (item?.url && !isValidExternalUrl(item.url)) {
            return res.status(400).json({ success: false, message: `Invalid URL format for ${item.platform || 'social link'}. Only HTTP and HTTPS protocols are allowed.` });
          }
        }
      }

      // Update on Gym model using explicitly sanitized fields
      const gym = await Gym.findByIdAndUpdate(gymStrId, { $set: cleanGymData }, { new: true, runValidators: true }).select('-password');
      req.updatedGym = gym;
    }

    // ─── 2. Owner Data Checks & Sanitization ─────────────────────────────────
    if (ownerData) {
      const { cleanData, hasInvalidFields } = sanitizePayload(ownerData, ALLOWED_OWNER_FIELDS);
      if (hasInvalidFields) {
        return res.status(400).json({ success: false, message: 'Request contains restricted or invalid fields.' });
      }
      cleanOwnerData = cleanData;

      if (cleanOwnerData.name && cleanOwnerData.name.length > 25) {
        return res.status(400).json({ success: false, message: 'Owner name cannot exceed 25 characters', field: 'ownerName' });
      }
      // Personal Mobile Format Check
      if (cleanOwnerData.mobileNo) {
        if (!phoneRegex.test(cleanOwnerData.mobileNo)) return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number', field: 'ownerMobile' });
      }

      // Update Owner in Gym Document
      const gym = await Gym.findById(gymStrId);
      if (gym) {
        gym.owner = {
          name: cleanOwnerData.name || gym.owner?.name,
          email: cleanOwnerData.mailId || cleanOwnerData.email || gym.owner?.email,
          mobile: cleanOwnerData.mobileNo || cleanOwnerData.mobile || gym.owner?.mobile,
          phone: cleanOwnerData.mobileNo || cleanOwnerData.phone || gym.owner?.phone
        };
        await gym.save();
        req.updatedOwner = {
          name: gym.owner.name,
          mobileNo: gym.owner.mobile,
          mailId: gym.owner.email
        };
        req.updatedGym = gym;
      }
    }

    const finalGym = req.updatedGym || await Gym.findById(gymStrId).select('-password');
    const finalGymObj = finalGym ? finalGym.toObject() : {};

    const finalOwner = finalGym?.owner ? {
      name: finalGym.owner.name,
      mobileNo: finalGym.owner.mobile || finalGym.owner.phone,
      mailId: finalGym.owner.email
    } : null;

    res.status(200).json({ 
      success: true, 
      data: { 
        gym: finalGymObj, 
        owner: finalOwner
      } 
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Owner Dashboard Stats
// @route   GET /api/gym/dashboard
// @access  Private (Owner)
exports.getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalClients = await Client.countDocuments({ isActive: true, isDeleted: { $ne: true }, 'membership.requestApproved': true });
    
    const activeClients = await Client.countDocuments({ 
      isActive: true,
      isDeleted: { $ne: true },
      'membership.requestApproved': true,
      memberships: { 
        $elemMatch: { 
          startDate: { $lte: today }, 
          endDate: { $gte: today } 
        } 
      }
    });

    const expiringSoon = await Client.countDocuments({ 
      isActive: true,
      isDeleted: { $ne: true },
      'membership.requestApproved': true,
      memberships: { 
        $elemMatch: { 
          endDate: { $gte: today, $lte: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000) } 
        } 
      }
    });

    const totalPlans = await Plan.countDocuments({ isActive: true });

    // Fetch lists with highly efficient lean queries
    const expiringSoonList = await Client.find({ 
      isActive: true,
      isDeleted: { $ne: true },
      'membership.requestApproved': true,
      memberships: { 
        $elemMatch: { 
          endDate: { $gte: today, $lte: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000) } 
        } 
      }
    }).limit(3).lean();

    const clients = await Client.find({ isActive: true, isDeleted: { $ne: true }, 'membership.requestApproved': true }).lean();
    
    const expiredClientsList = clients.filter(client => {
      const memberships = client.memberships || (client.membership?.startDate ? [client.membership] : []);
      if (memberships.length === 0) return false;
      const hasActiveOrUpcoming = memberships.some(m => {
        const endDate = new Date(m.endDate);
        return endDate >= today;
      });
      return !hasActiveOrUpcoming;
    });
    
    expiredClientsList.sort((a, b) => new Date(b.membership?.endDate || 0) - new Date(a.membership?.endDate || 0));

    const expiredClients = expiredClientsList.length;
    const expiredList = expiredClientsList.slice(0, 3);

    const pendingList = await Client.find({ 'membership.requestApproved': false, isActive: true, isDeleted: { $ne: true } }).lean();

    const recentClients = await Client.find({ isActive: true, isDeleted: { $ne: true }, 'membership.requestApproved': true })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Financial calculations via database-level mathematical reductions (highly scalable)
    const [revenueAgg, expenseAgg] = await Promise.all([
      Payment.aggregate([
        { $group: { _id: null, total: { $sum: "$paidAmount" } } }
      ]),
      Expense.aggregate([
        { $match: { isReminder: { $ne: true } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;
    const totalExpenses = expenseAgg[0]?.total || 0;
    const netProfit = totalRevenue - totalExpenses;

    // Monthly data for chart (Last 6 months comparative aggregation)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [monthlyRevenueAgg, monthlyExpensesAgg] = await Promise.all([
      Payment.aggregate([
        {
          $match: {
            $or: [
              { paymentDate: { $gte: sixMonthsAgo } },
              { createdAt: { $gte: sixMonthsAgo } }
            ]
          }
        },
        {
          $project: {
            paidAmount: 1,
            date: { $ifNull: ["$paymentDate", "$createdAt"] }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: "$date" },
              month: { $month: "$date" }
            },
            revenue: { $sum: "$paidAmount" }
          }
        }
      ]),
      Expense.aggregate([
        {
          $match: {
            isReminder: { $ne: true },
            $or: [
              { date: { $gte: sixMonthsAgo } },
              { createdAt: { $gte: sixMonthsAgo } }
            ]
          }
        },
        {
          $project: {
            amount: 1,
            date: { $ifNull: ["$date", "$createdAt"] }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: "$date" },
              month: { $month: "$date" }
            },
            expenses: { $sum: "$amount" }
          }
        }
      ])
    ]);

    const revenueMap = new Map();
    monthlyRevenueAgg.forEach(item => {
      if (item._id) {
        revenueMap.set(`${item._id.year}-${item._id.month}`, item.revenue);
      }
    });

    const expensesMap = new Map();
    monthlyExpensesAgg.forEach(item => {
      if (item._id) {
        expensesMap.set(`${item._id.year}-${item._id.month}`, item.expenses);
      }
    });

    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthName = d.toLocaleString('default', { month: 'short' });
      const monthNum = d.getMonth() + 1; // MongoDB $month is 1-12
      const yearNum = d.getFullYear();
      const key = `${yearNum}-${monthNum}`;

      chartData.push({
        month: monthName,
        revenue: revenueMap.get(key) || 0,
        expenses: expensesMap.get(key) || 0
      });
    }

    res.status(200).json({
      success: true,
      data: {
        stats: { totalClients, activeClients, expiringSoon, expiredClients, totalPlans, totalRevenue, totalExpenses, netProfit },
        chartData,
        expiringSoonList,
        expiredList,
        pendingList,
        recentClients
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Gym Public Profile
// @route   GET /api/gym/public/:gymId
// @access  Public
exports.getGymPublicProfile = async (req, res, next) => {
   try {
       const gym = await Gym.findOne({ gymId: req.params.gymId });
       if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });
       res.status(200).json({ success: true, data: { gymName: gym.gymName } });
   } catch (err) { next(err); }
};

// @desc    Change Gym Owner Password
// @route   PUT /api/gym/change-password
// @access  Private (Owner)
exports.changeGymPassword = async (req, res, next) => {
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

    const gym = await Gym.findById(req.user._id);

    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }

    const isMatch = await gym.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    gym.password = newPassword;
    await gym.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Update Gym Logo
// @route   PUT /api/gym/profile/logo
// @access  Private (Owner)
exports.updateGymLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }

    let logoUrl = '';
    try {
      const { uploadLogoToCloudinary } = require('../utils/cloudinary');
      logoUrl = await uploadLogoToCloudinary(req.file.path);
    } catch (uploadErr) {
      console.error('Failed to upload logo to Cloudinary:', uploadErr);
      return res.status(500).json({ success: false, message: 'Failed to upload logo to cloud storage' });
    }

    const gymStrId = req.user._id.toString();
    const gym = await Gym.findById(gymStrId);
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }

    gym.gymLogo = logoUrl;
    await gym.save();

    res.status(200).json({
      success: true,
      message: 'Logo updated successfully',
      data: {
        gymLogo: logoUrl,
        logo: logoUrl
      }
    });
  } catch (err) {
    next(err);
  }
};

