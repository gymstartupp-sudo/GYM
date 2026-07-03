const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadIssueFiles } = require('../middleware/upload');
const ic = require('../controllers/issueController');

// multer fields: up to 5 screenshots + 1 video
const issueUpload = uploadIssueFiles.fields([
  { name: 'screenshots', maxCount: 5 },
  { name: 'video', maxCount: 1 }
]);

// ─── Owner Routes ─────────────────────────────────────────────────────────────
router.post('/', protect, authorize('owner'), issueUpload, ic.submitIssue);
router.get('/mine', protect, authorize('owner'), ic.getMyIssues);

// ─── Admin Routes ─────────────────────────────────────────────────────────────
router.get('/stats', protect, authorize('superadmin'), ic.getIssueStats);
router.get('/', protect, authorize('superadmin'), ic.getAllIssues);
router.get('/:id', protect, authorize('superadmin'), ic.getIssueById);
router.put('/:id/status', protect, authorize('superadmin'), ic.updateIssueStatus);
router.post('/:id/note', protect, authorize('superadmin'), ic.addAdminNote);
router.post('/:id/reply', protect, authorize('superadmin'), ic.addReply);
router.delete('/:id', protect, authorize('superadmin'), ic.deleteIssue);

module.exports = router;
