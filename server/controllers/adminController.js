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
    // Active clients = isActive: true across all gyms
    const totalClients = await Client.countDocuments({ isActive: true });
    const totalPayments = await Payment.countDocuments();

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

    const gymIdStr = gym.gymId;
    const owner = gym.owner ? {
      name: gym.owner.name,
      mobileNo: gym.owner.mobile,
      mailId: gym.owner.email
    } : null;

    const [totalClients, activeClients, totalPlans, totalPayments] = await Promise.all([
      Client.countDocuments({ gymId: gymIdStr }),
      Client.countDocuments({ gymId: gymIdStr, isActive: true }),
      Plan.countDocuments({ gymId: gymIdStr }),
      Payment.countDocuments({ gymId: gymIdStr })
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
    const gym = await Gym.findById(req.params.id).select('_id gymId gymName').lean();
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    const gymIdStr = gym.gymId;

    // Cascade delete all associated data using gymId string
    await Promise.all([
      Client.deleteMany({ gymId: gymIdStr }),
      Plan.deleteMany({ gymId: gymIdStr }),
      Payment.deleteMany({ gymId: gymIdStr }),
      Expense.deleteMany({ gymId: gymIdStr }),
      Feedback.deleteMany({ gymId: gymIdStr }),
      Counter.deleteMany({
        name: {
          $in: [
            `clientId:${gymIdStr}`,
            new RegExp(`^paymentId:${gymIdStr}:`)
          ]
        }
      })
    ]);

    // Finally delete the gym itself
    await Gym.deleteOne({ _id: gym._id });

    res.status(200).json({
      success: true,
      message: `Gym "${gym.gymName}" and all associated data deleted permanently`
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
