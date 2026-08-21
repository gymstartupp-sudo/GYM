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
        if (user && (user.isActive === false || user.isDeleted === true)) {
          return res.status(403).json({ success: false, message: 'Not authorized, client account is deactivated' });
        }
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
      } else if (decoded.role === 'superadmin' || decoded.role === 'developer') {
        user = { _id: decoded.id };
        role = decoded.role;
        
        // Populate target gym details if viewing a gym context
        const gymIdHeader = (req.headers && req.headers['x-gym-id']) || (req.query && req.query.gymId) || (req.body && req.body.gymId);
        if (gymIdHeader) {
          const mongoose = require('mongoose');
          const Gym = mongoose.model('Gym');
          const gym = await Gym.findOne({ gymId: gymIdHeader.trim().toUpperCase() }).select('gymId gymName').lean();
          if (gym) {
            user.gymId = gym.gymId;
            user.gymName = gym.gymName;
          }
        }
      }

      if (!user) {
         return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      user.sessionId = decoded.sessionId || null;

      // Block write operations on gym-specific APIs for Super Admin / Developer
      if ((role === 'superadmin' || role === 'developer') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const isAllowedAdminPath = req.originalUrl.startsWith('/api/admin') || 
                                   req.originalUrl.startsWith('/api/issues') || 
                                   req.originalUrl.startsWith('/api/auth');
        if (!isAllowedAdminPath) {
          return res.status(403).json({ success: false, message: 'Super Admin / Developer is in read-only mode for gym data' });
        }
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
    // If user has direct role access, allow it
    if (roles.includes(req.userRole)) {
      return next();
    }
    // Allow superadmin to perform read-only GET requests on owner endpoints
    if (req.userRole === 'superadmin' && req.method === 'GET' && roles.includes('owner')) {
      return next();
    }
    return res.status(403).json({ success: false, message: `User role ${req.userRole} is not authorized to access this route` });
  };
};

module.exports = { protect, authorize };
