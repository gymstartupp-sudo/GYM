const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const clientController = require('../controllers/clientController');

router.get('/profile', protect, authorize('client'), clientController.getClientProfile);
router.put('/profile', protect, authorize('client'), clientController.updateClientProfile);
router.put('/change-password', protect, authorize('client'), clientController.changeClientPassword);

router.route('/')
  .get(protect, authorize('owner', 'superadmin'), clientController.getClients)
  .post(protect, authorize('owner'), clientController.addClient);

router.get('/inactive', protect, authorize('owner', 'superadmin'), clientController.getInactiveClients);

router.route('/:id')
  .get(protect, authorize('owner', 'superadmin'), clientController.getClientById)
  .delete(protect, authorize('owner'), clientController.deleteClient);

router.put('/:id/approve', protect, authorize('owner'), clientController.approveClient);
router.put('/:id/deactivate', protect, authorize('owner'), clientController.deactivateClient);
router.put('/:id/reactivate', protect, authorize('owner'), clientController.reactivateClient);
router.post('/:id/send-reminder', protect, authorize('owner'), clientController.sendManualReminder);

module.exports = router;
