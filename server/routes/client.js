const express = require('express');
const { query } = require('express-validator');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const clientController = require('../controllers/clientController');
const {
  validate,
  emailValidation,
  phoneValidation,
  mongoIdValidation,
  stringValidation,
  numberValidation
} = require('../middleware/validate');

const clientProfileValidation = [
  emailValidation('personalInfo.email', true),
  phoneValidation('personalInfo.mobileNo', true)
];

const changePasswordValidation = [
  stringValidation('currentPassword'),
  stringValidation('newPassword')
];

const getClientsQueryValidation = [
  query('status').optional().isString().trim(),
  query('planName').optional().isString().trim(),
  query('plan').optional().isString().trim(),
  query('gymId').optional().isString().trim()
];

const addClientValidation = [
  emailValidation('personalInfo.email'),
  phoneValidation('personalInfo.mobileNo'),
  stringValidation('personalInfo.name'),
  stringValidation('personalInfo.dob'),
  stringValidation('personalInfo.gender'),
  stringValidation('personalInfo.address'),
  stringValidation('password')
];

router.get('/profile', protect, authorize('client'), clientController.getClientProfile);
router.put('/profile', protect, authorize('client'), clientProfileValidation, validate, clientController.updateClientProfile);
router.put('/change-password', protect, authorize('client'), changePasswordValidation, validate, clientController.changeClientPassword);

router.route('/')
  .get(protect, authorize('owner', 'superadmin', 'developer'), getClientsQueryValidation, validate, clientController.getClients)
  .post(protect, authorize('owner'), addClientValidation, validate, clientController.addClient);

router.get('/inactive', protect, authorize('owner', 'superadmin', 'developer'), getClientsQueryValidation, validate, clientController.getInactiveClients);
router.get('/deleted', protect, authorize('owner', 'superadmin', 'developer'), clientController.getDeletedClients);

router.route('/:id')
  .get(protect, authorize('owner', 'superadmin', 'developer'), [mongoIdValidation('id', 'param')], validate, clientController.getClientById)
  .delete(protect, authorize('owner'), [mongoIdValidation('id', 'param')], validate, clientController.deleteClient);

router.put('/:id/restore', protect, authorize('owner'), [mongoIdValidation('id', 'param')], validate, clientController.restoreClient);
router.put('/:id/approve', protect, authorize('owner'), [mongoIdValidation('id', 'param')], validate, clientController.approveClient);
router.put('/:id/deactivate', protect, authorize('owner'), [mongoIdValidation('id', 'param')], validate, clientController.deactivateClient);
router.put('/:id/reactivate', protect, authorize('owner'), [mongoIdValidation('id', 'param')], validate, clientController.reactivateClient);
router.post('/:id/send-reminder', protect, authorize('owner'), [mongoIdValidation('id', 'param')], validate, clientController.sendManualReminder);
router.post('/:id/send-overdue-reminder', protect, authorize('owner'), [mongoIdValidation('id', 'param')], validate, clientController.sendManualReminder);

module.exports = router;
