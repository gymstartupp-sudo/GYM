const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const gymController = require('../controllers/gymController');

router.get('/public/:gymId', gymController.getGymPublicProfile);

router.get('/profile', protect, authorize('owner'), gymController.getGymProfile);
router.put('/profile', protect, authorize('owner'), gymController.updateGymProfile);
router.put('/change-password', protect, authorize('owner'), gymController.changeGymPassword);
router.get('/dashboard', protect, authorize('owner'), gymController.getDashboardStats);

module.exports = router;
