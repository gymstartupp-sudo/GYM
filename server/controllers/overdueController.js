const Client = require('../models/Client');
const { getPlanStatus } = require('../utils/membership');

// @desc    Get Overdue Clients
// @route   GET /api/overdue
// @access  Private (Owner)
exports.getOverdueClients = async (req, res, next) => {
  try {
    const clients = await Client.find({ 
      isActive: true,
      isDeleted: { $ne: true },
      'membership.requestApproved': true,
      paymentStatus: 'overdue'
    }).sort({ 'membership.endDate': 1 }).lean();
    
    res.status(200).json({ success: true, count: clients.length, data: clients });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Expired Membership Clients
// @route   GET /api/overdue/expired
// @access  Private (Owner)
exports.getExpiredClients = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);

    const clients = await Client.find({ 
      isActive: true,
      isDeleted: { $ne: true },
      'membership.requestApproved': true
    }).lean();

    const expiredClients = clients.filter(client => {
      const memberships = client.memberships || (client.membership?.startDate ? [client.membership] : []);
      if (memberships.length === 0) return false;

      // Check if any plan is currently Active or Upcoming
      const hasActiveOrUpcoming = memberships.some(m => {
        const status = getPlanStatus(m, today);
        return status === 'active' || status === 'upcoming';
      });

      // If they have no active/upcoming plans, and at least one expired plan
      return !hasActiveOrUpcoming;
    });

    // Sort by most recently expired
    expiredClients.sort((a, b) => {
      const aEnd = a.membership?.endDate ? new Date(a.membership.endDate) : 0;
      const bEnd = b.membership?.endDate ? new Date(b.membership.endDate) : 0;
      return bEnd - aEnd;
    });
    
    res.status(200).json({ success: true, count: expiredClients.length, data: expiredClients });
  } catch (err) {
    next(err);
  }
};
