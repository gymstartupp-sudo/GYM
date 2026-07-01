const Gym = require('../models/Gym');
const Client = require('../models/Client');
const Payment = require('../models/Payment');
const Plan = require('../models/Plan');
const Expense = require('../models/Expense');
const Feedback = require('../models/Feedback');
const Counter = require('../models/Counter');

// @desc    Get Admin Dashboard Stats
// @route   GET /api/admin/dashboard
// @access  Private (SuperAdmin)
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalGyms = await Gym.countDocuments();
    const gyms = await Gym.find({ isActive: true });
    let totalClients = 0;
    let totalPayments = 0;
    const { getTenantConnection } = require('../utils/connectionManager');

    for (const gym of gyms) {
      try {
        const conn = await getTenantConnection(gym.dbName);
        const TenantClient = conn.model('Client');
        const TenantPayment = conn.model('Payment');
        totalClients += await TenantClient.countDocuments({ isActive: true });
        totalPayments += await TenantPayment.countDocuments();
      } catch (err) {
        console.error(`Error counting stats in tenant ${gym.dbName}:`, err);
      }
    }

    res.status(200).json({
      success: true,
      data: { totalGyms, totalClients, totalPayments }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get All Gyms
// @route   GET /api/admin/gyms
// @access  Private (SuperAdmin)
exports.getAllGyms = async (req, res, next) => {
  try {
    const gyms = await Gym.find().select('-password').lean();

    const data = gyms.map(gym => ({
      ...gym,
      ownerName: gym.owner?.name || 'N/A'
    }));

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Single Gym Profile (for admin view)
// @route   GET /api/admin/gym/:id/profile
// @access  Private (SuperAdmin)
exports.getGymProfile = async (req, res, next) => {
  try {
    const gym = await Gym.findById(req.params.id).select('-password').lean();
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    const owner = gym.owner ? {
      name: gym.owner.name,
      mobileNo: gym.owner.mobile,
      mailId: gym.owner.email
    } : null;

    const { getTenantConnection } = require('../utils/connectionManager');
    const conn = await getTenantConnection(gym.dbName);
    const TenantClient = conn.model('Client');
    const TenantPlan = conn.model('Plan');
    const TenantPayment = conn.model('Payment');

    const [totalClients, activeClients, totalPlans, totalPayments] = await Promise.all([
      TenantClient.countDocuments({}),
      TenantClient.countDocuments({ isActive: true }),
      TenantPlan.countDocuments({}),
      TenantPayment.countDocuments({})
    ]);

    res.status(200).json({
      success: true,
      data: {
        gym,
        owner: owner || null,
        stats: { totalClients, activeClients, totalPlans, totalPayments }
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle Gym Status (activate/deactivate)
// @route   PUT /api/admin/gym/:id/status
// @access  Private (SuperAdmin)
exports.toggleGymStatus = async (req, res, next) => {
  try {
    const gym = await Gym.findById(req.params.id);
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    gym.isActive = !gym.isActive;
    await gym.save();

    res.status(200).json({ success: true, data: gym });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete Gym and all associated data permanently
// @route   DELETE /api/admin/gym/:id
// @access  Private (SuperAdmin)
exports.deleteGym = async (req, res, next) => {
  try {
    const gym = await Gym.findById(req.params.id).select('_id gymId gymName dbName').lean();
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    // Cascade drop the tenant database
    const { getTenantConnection } = require('../utils/connectionManager');
    try {
      const conn = await getTenantConnection(gym.dbName);
      await conn.db.dropDatabase();
      console.log(`Database ${gym.dbName} dropped successfully`);
    } catch (dbErr) {
      console.error(`Failed to drop database ${gym.dbName}:`, dbErr);
    }

    // Finally delete the gym platform metadata document
    await Gym.deleteOne({ _id: gym._id });

    res.status(200).json({
      success: true,
      message: `Gym "${gym.gymName}" and its isolated database deleted permanently`
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Trigger Overdue Check manually
// @route   POST /api/admin/overdue-check
// @access  Private (SuperAdmin)
exports.triggerOverdueCheck = async (req, res, next) => {
  try {
    const { runOverdueCheck } = require('../jobs/statusUpdater');
    const stats = await runOverdueCheck();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
};
