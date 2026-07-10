const Gym = require('../models/Gym');
const Client = require('../models/Client');
const Plan = require('../models/Plan');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');

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

// @desc    Update Gym Profile
// @route   PUT /api/gym/profile
// @access  Private (Owner)
exports.updateGymProfile = async (req, res, next) => {
  try {
    const { gymData, ownerData } = req.body;
    const gymStrId = req.user._id.toString();

    const phoneRegex = /^[6-9]\d{9}$/;

    // ─── 1. Gym Data Checks ──────────────────────────────────────────────────
    if (gymData) {
      if (gymData.gymName && gymData.gymName.length > 25) {
        return res.status(400).json({ success: false, message: 'Gym name cannot exceed 25 characters', field: 'gymName' });
      }

      // Duplicate Email Check
      if (gymData.gymEmail) {
        const emailExists = await Gym.findOne({ gymEmail: gymData.gymEmail, _id: { $ne: gymStrId } });
        if (emailExists) return res.status(400).json({ success: false, message: 'Email already exists', field: 'gymEmail' });
      }

      // Duplicate Contact Check
      if (gymData.gymContact) {
        if (!phoneRegex.test(gymData.gymContact)) {
          return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number', field: 'gymContact' });
        }
        const contactExists = await Gym.findOne({ gymContact: gymData.gymContact, _id: { $ne: gymStrId } });
        if (contactExists) return res.status(400).json({ success: false, message: 'Phone number already exists', field: 'gymContact' });
      }

      if (gymData.reminderSettings) {
        const { whatsappNumber, phoneNumber } = gymData.reminderSettings;
        if (whatsappNumber && !phoneRegex.test(whatsappNumber)) {
          return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number', field: 'whatsapp' });
        }
        if (phoneNumber && !phoneRegex.test(phoneNumber)) {
          return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number', field: 'smsPhone' });
        }
      }

      if (gymData.billingInfo) {
        const { helpContact } = gymData.billingInfo;
        if (helpContact && !phoneRegex.test(helpContact)) {
          return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number', field: 'billHelp' });
        }
      }

      // Password Safeguard
      delete gymData.password;

      // Update on Gym model directly
      const gym = await Gym.findByIdAndUpdate(gymStrId, { $set: gymData }, { new: true, runValidators: true }).select('-password');
      req.updatedGym = gym;
    }

    // ─── 2. Owner Data Checks ─────────────────────────────────────────────────
    if (ownerData) {
      if (ownerData.name && ownerData.name.length > 25) {
        return res.status(400).json({ success: false, message: 'Owner name cannot exceed 25 characters', field: 'ownerName' });
      }
      // Personal Mobile Format Check
      if (ownerData.mobileNo) {
        if (!phoneRegex.test(ownerData.mobileNo)) return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number', field: 'ownerMobile' });
      }

      // Update Owner in Gym Document
      const gym = await Gym.findById(gymStrId);
      if (gym) {
        gym.owner = {
          name: ownerData.name || gym.owner?.name,
          email: ownerData.mailId || gym.owner?.email,
          mobile: ownerData.mobileNo || gym.owner?.mobile,
          phone: ownerData.mobileNo || gym.owner?.phone
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
    const { currentPassword, newPassword } = req.body;
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

