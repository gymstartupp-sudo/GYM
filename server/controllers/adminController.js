const Gym = require('../models/Gym');
const Client = require('../models/Client');
const Payment = require('../models/Payment');
const Owner = require('../models/Owner');

// @desc    Get Admin Dashboard Stats
// @route   GET /api/admin/dashboard
// @access  Private (SuperAdmin)
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalGyms = await Gym.countDocuments();
    const totalClients = await Client.countDocuments();
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
    const owners = await Owner.find().lean();
    
    // Build O(1) Map for gym owners lookup
    const ownersMap = new Map();
    owners.forEach(owner => {
      if (owner.gymId) {
        ownersMap.set(owner.gymId.toString(), owner.name);
      }
    });
    
    const data = gyms.map(gym => ({
      ...gym,
      ownerName: ownersMap.get(gym._id.toString()) || 'N/A'
    }));

    res.status(200).json({ success: true, data });
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
