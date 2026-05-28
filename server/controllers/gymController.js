const Gym = require('../models/Gym');
const Owner = require('../models/Owner');
const Client = require('../models/Client');
const Plan = require('../models/Plan');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');

// @desc    Get Gym Profile
// @route   GET /api/gym/profile
// @access  Private (Owner)
exports.getGymProfile = async (req, res, next) => {
  try {
    const gymStrId = req.user._id.toString();
    const gym = await Gym.findById(gymStrId).select('-password');
    const owner = await Owner.findOne({ gymId: gymStrId });
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
      // Duplicate Email Check
      if (gymData.gymEmail) {
        const emailExists = await Gym.findOne({ gymEmail: gymData.gymEmail, _id: { $ne: gymStrId } });
        if (emailExists) return res.status(400).json({ success: false, message: 'Email already exists', field: 'gymEmail' });
      }

      // Duplicate Contact Check
      if (gymData.gymContact) {
        const contactExists = await Gym.findOne({ gymContact: gymData.gymContact, _id: { $ne: gymStrId } });
        if (contactExists) return res.status(400).json({ success: false, message: 'Phone number already exists', field: 'gymContact' });
      }

      // Password Safeguard
      delete gymData.password;

      // Update Gym
      const gym = await Gym.findByIdAndUpdate(gymStrId, gymData, { new: true, runValidators: true }).select('-password');
      req.updatedGym = gym; // temp store for response
    }

    // ─── 2. Owner Data Checks ─────────────────────────────────────────────────
    if (ownerData) {
      // Duplicate Personal Mobile Check
      if (ownerData.mobileNo) {
        if (!phoneRegex.test(ownerData.mobileNo)) return res.status(400).json({ success: false, message: 'Enter a valid Indian mobile number', field: 'ownerMobile' });
        const mobileExists = await Owner.findOne({ mobileNo: ownerData.mobileNo, gymId: { $ne: gymStrId } });
        if (mobileExists) return res.status(400).json({ success: false, message: 'Phone number already exists', field: 'ownerMobile' });
      }

      // Duplicate Personal Email Check (mailId)
      if (ownerData.mailId) {
        const mailExists = await Owner.findOne({ mailId: ownerData.mailId, gymId: { $ne: gymStrId } });
        if (mailExists) return res.status(400).json({ success: false, message: 'Email already exists', field: 'ownerEmail' });
      }

      // Update Owner
      const owner = await Owner.findOneAndUpdate({ gymId: gymStrId }, ownerData, { new: true, runValidators: true });
      req.updatedOwner = owner;
    }

    res.status(200).json({ 
      success: true, 
      data: { 
        gym: req.updatedGym || await Gym.findById(gymStrId).select('-password'), 
        owner: req.updatedOwner || await Owner.findOne({ gymId: gymStrId }) 
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
    const gymIdStr = req.user.gymId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalClients = await Client.countDocuments({ gymId: gymIdStr, isActive: true });
    
    const activeClients = await Client.countDocuments({ 
      gymId: gymIdStr, 
      isActive: true,
      memberships: { 
        $elemMatch: { 
          startDate: { $lte: today }, 
          endDate: { $gte: today } 
        } 
      }
    });

    const expiringSoon = await Client.countDocuments({ 
      gymId: gymIdStr, 
      isActive: true,
      memberships: { 
        $elemMatch: { 
          endDate: { $gte: today, $lte: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000) } 
        } 
      }
    });

    const totalPlans = await Plan.countDocuments({ gymId: gymIdStr, isActive: true });

    // Fetch lists
    const expiringSoonList = await Client.find({ 
      gymId: gymIdStr, 
      isActive: true,
      memberships: { 
        $elemMatch: { 
          endDate: { $gte: today, $lte: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000) } 
        } 
      }
    }).limit(3);

    const clients = await Client.find({ gymId: gymIdStr, isActive: true });
    
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

    const pendingList = await Client.find({ gymId: gymIdStr, 'membership.requestApproved': false, isActive: true });

    const recentClients = await Client.find({ gymId: gymIdStr, isActive: true })
      .sort({ createdAt: -1 })
      .limit(5);

    // Financial calculations
    const payments = await Payment.find({ gymId: gymIdStr });
    const totalRevenue = payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);

    const expenses = await Expense.find({ gymId: gymIdStr, isReminder: { $ne: true } });
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const netProfit = totalRevenue - totalExpenses;

    // Monthly data for chart (Last 6 months)
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthName = d.toLocaleString('default', { month: 'short' });
        const monthNum = d.getMonth();
        const yearNum = d.getFullYear();

        const monthlyRevenue = payments
            .filter(p => {
                const pDate = new Date(p.paymentDate || p.createdAt);
                return pDate.getMonth() === monthNum && pDate.getFullYear() === yearNum;
            })
            .reduce((sum, p) => sum + (p.paidAmount || 0), 0);

        const monthlyExpenses = expenses
            .filter(e => {
                const eDate = new Date(e.date || e.createdAt);
                return eDate.getMonth() === monthNum && eDate.getFullYear() === yearNum;
            })
            .reduce((sum, e) => sum + (e.amount || 0), 0);

        chartData.push({
            month: monthName,
            revenue: monthlyRevenue,
            expenses: monthlyExpenses
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
