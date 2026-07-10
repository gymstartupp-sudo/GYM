const jwt = require('jsonwebtoken');
const Gym = require('../models/Gym');
const Client = require('../models/Client');
const Admin = require('../models/Admin');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      let user = null;
      let role = null;

      // Determine user type based on token role embedded during authentication
      if (decoded.role === 'client') {
        user = await Client.findById(decoded.id).select('-password').lean();
        role = 'client';
        // Block login if the client's gym has been deactivated by admin
        if (user && user.gymId) {
          const gym = await Gym.findOne({ gymId: user.gymId }).select('isActive').lean();
          if (!gym || gym.isActive === false) {
            return res.status(403).json({ success: false, message: 'Not authorized, your gym account has been suspended' });
          }
        }
      } else if (decoded.role === 'owner') {
        if (decoded.gymId) {
          // Verify gym is active in the database
          const gym = await Gym.findOne({ gymId: decoded.gymId }).select('isActive').lean();
          if (!gym || gym.isActive === false) {
            return res.status(403).json({ success: false, message: 'Not authorized, gym account is inactive or suspended' });
          }
          user = { _id: decoded.id, gymId: decoded.gymId, gymName: decoded.gymName };
        } else {
          user = await Gym.findById(decoded.id).select('-password').lean();
          if (user && user.isActive === false) {
            return res.status(403).json({ success: false, message: 'Not authorized, gym account is inactive or suspended' });
          }
        }
        role = 'owner';
      } else if (decoded.role === 'superadmin') {
        // Fast-path: Superadmin does not have gym-specific variables in authMiddleware
        user = { _id: decoded.id };
        role = 'superadmin';
      }

      if (!user) {
         return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      req.user = user;
      req.userRole = role;
      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ success: false, message: `User role ${req.userRole} is not authorized to access this route` });
    }
    next();
  };
};

module.exports = { protect, authorize };
