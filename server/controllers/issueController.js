const IssueReport = require('../models/IssueReport');
const path = require('path');
const crypto = require('crypto');

// Generate a unique ticket ID like TKT-20240702-A3F9C
const generateTicketId = () => {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TKT-${dateStr}-${rand}`;
};

const backendUrl = (process.env.VITE_API_URL || process.env.BACKEND_URL || 'http://localhost:5001').replace('/api', '');

// Helper to build public URL for uploaded files
const toPublicUrl = (filePath) => {
  if (!filePath) return null;
  const relative = filePath.replace(/\\/g, '/').split('uploads/')[1];
  return relative ? `/uploads/${relative}` : filePath;
};

const { sanitizePayload } = require('../utils/allowlist');

// ─── Owner ──────────────────────────────────────────────────────────────────

// @desc    Submit a new issue report
// @route   POST /api/issues
// @access  Private (owner)
exports.submitIssue = async (req, res, next) => {
  try {
    const ALLOWED_SUBMIT_FIELDS = [
      'category', 'title', 'description', 'severity',
      'ownerEmail', 'browser', 'operatingSystem', 'resolution',
      'currentPage', 'appVersion', 'gymName', 'ownerName', 'ownerPhone', 'gymId'
    ];
    const { cleanData, hasInvalidFields } = sanitizePayload(req.body, ALLOWED_SUBMIT_FIELDS);
    if (hasInvalidFields) {
      return res.status(400).json({ success: false, message: 'Request contains restricted or invalid fields.' });
    }

    const {
      category, title, description, severity,
      ownerEmail, browser, operatingSystem, resolution,
      currentPage, appVersion
    } = cleanData;

    if (!category || !title || !description) {
      return res.status(400).json({ success: false, message: 'Category, title and description are required' });
    }

    // Extract gym info from JWT (set by authMiddleware)
    const gymId = req.user?.gymId;
    const gymName = req.user?.gymName || cleanData.gymName || '';
    const ownerName = cleanData.ownerName || '';
    const ownerPhone = cleanData.ownerPhone || '';

    // Handle uploaded files
    const files = req.files || {};
    const screenshotFiles = files.screenshots || [];
    const videoFile = files.video ? files.video[0] : null;

    const screenshots = screenshotFiles.map(f => toPublicUrl(f.path));
    const video = videoFile ? toPublicUrl(videoFile.path) : null;

    // Ensure unique ticket ID
    let ticketId;
    let attempts = 0;
    do {
      ticketId = generateTicketId();
      attempts++;
    } while (attempts < 5 && await IssueReport.exists({ ticketId }));

    const issue = await IssueReport.create({
      ticketId,
      gymId: gymId || cleanData.gymId,
      gymName,
      ownerName,
      ownerEmail: ownerEmail || '',
      ownerPhone,
      category,
      title: title.trim(),
      description: description.trim(),
      severity: severity || 'Medium',
      screenshots,
      video,
      browser: browser || '',
      operatingSystem: operatingSystem || '',
      resolution: resolution || '',
      currentPage: currentPage || '',
      appVersion: appVersion || '1.0.0',
      status: 'Open'
    });

    res.status(201).json({
      success: true,
      message: 'Issue reported successfully',
      data: { ticketId: issue.ticketId, _id: issue._id, createdAt: issue.createdAt }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get owner's own tickets
// @route   GET /api/issues/mine
// @access  Private (owner)
exports.getMyIssues = async (req, res, next) => {
  try {
    const gymId = req.user?.gymId;
    if (!gymId) return res.status(400).json({ success: false, message: 'Gym context required' });

    const issues = await IssueReport.find({ gymId })
      .select('ticketId title category severity status createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: issues });
  } catch (err) {
    next(err);
  }
};

// ─── Admin ───────────────────────────────────────────────────────────────────

// @desc    Get all issues (with filters & pagination)
// @route   GET /api/issues
// @access  Private (superadmin)
exports.getAllIssues = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 15,
      search, category, severity, status,
      dateFrom, dateTo
    } = req.query;

    const filter = {};

    if (search) {
      const rx = new RegExp(search.trim(), 'i');
      filter.$or = [
        { ticketId: rx },
        { gymName: rx },
        { ownerName: rx },
        { title: rx }
      ];
    }
    if (category) filter.category = category;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = d;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [issues, total] = await Promise.all([
      IssueReport.find(filter)
        .select('ticketId gymId gymName ownerName ownerEmail title category severity status createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      IssueReport.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: issues,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single issue by ID
// @route   GET /api/issues/:id
// @access  Private (superadmin)
exports.getIssueById = async (req, res, next) => {
  try {
    const issue = await IssueReport.findById(req.params.id).lean();
    if (!issue) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data: issue });
  } catch (err) {
    next(err);
  }
};

// @desc    Get dashboard stats
// @route   GET /api/issues/stats
// @access  Private (superadmin)
exports.getIssueStats = async (req, res, next) => {
  try {
    const [total, open, inProgress, resolved, critical] = await Promise.all([
      IssueReport.countDocuments(),
      IssueReport.countDocuments({ status: 'Open' }),
      IssueReport.countDocuments({ status: 'In Progress' }),
      IssueReport.countDocuments({ status: 'Resolved' }),
      IssueReport.countDocuments({ severity: 'Critical', status: { $nin: ['Resolved', 'Closed'] } })
    ]);

    res.status(200).json({ success: true, data: { total, open, inProgress, resolved, critical } });
  } catch (err) {
    next(err);
  }
};

// @desc    Update issue status
// @route   PUT /api/issues/:id/status
// @access  Private (superadmin)
exports.updateIssueStatus = async (req, res, next) => {
  try {
    const { cleanData, hasInvalidFields } = sanitizePayload(req.body, ['status']);
    if (hasInvalidFields) {
      return res.status(400).json({ success: false, message: 'Request contains restricted or invalid fields.' });
    }

    const { status } = cleanData;
    const allowed = ['Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const issue = await IssueReport.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, select: 'ticketId status updatedAt' }
    ).lean();

    if (!issue) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data: issue });
  } catch (err) {
    next(err);
  }
};

// @desc    Add internal admin note
// @route   POST /api/issues/:id/note
// @access  Private (superadmin)
exports.addAdminNote = async (req, res, next) => {
  try {
    const { cleanData, hasInvalidFields } = sanitizePayload(req.body, ['message']);
    if (hasInvalidFields) {
      return res.status(400).json({ success: false, message: 'Request contains restricted or invalid fields.' });
    }

    const { message } = cleanData;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Note message required' });

    const issue = await IssueReport.findByIdAndUpdate(
      req.params.id,
      { $push: { adminNotes: { message: message.trim() } } },
      { new: true, select: 'adminNotes' }
    ).lean();

    if (!issue) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data: issue.adminNotes });
  } catch (err) {
    next(err);
  }
};

// @desc    Add reply to gym owner
// @route   POST /api/issues/:id/reply
// @access  Private (superadmin)
exports.addReply = async (req, res, next) => {
  try {
    const { cleanData, hasInvalidFields } = sanitizePayload(req.body, ['message']);
    if (hasInvalidFields) {
      return res.status(400).json({ success: false, message: 'Request contains restricted or invalid fields.' });
    }

    const { message } = cleanData;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Reply message required' });

    const issue = await IssueReport.findByIdAndUpdate(
      req.params.id,
      { $push: { replies: { from: 'admin', message: message.trim() } } },
      { new: true, select: 'replies' }
    ).lean();

    if (!issue) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data: issue.replies });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete an issue ticket
// @route   DELETE /api/issues/:id
// @access  Private (superadmin)
exports.deleteIssue = async (req, res, next) => {
  try {
    const issue = await IssueReport.findByIdAndDelete(req.params.id).lean();
    if (!issue) return res.status(404).json({ success: false, message: 'Ticket not found' });

    // Optional: delete uploaded files from disk
    const fs = require('fs');
    const allFiles = [...(issue.screenshots || []), issue.video].filter(Boolean);
    allFiles.forEach(relUrl => {
      try {
        const absPath = path.join(__dirname, '..', relUrl.replace(/^\//, ''));
        if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
      } catch (_) {}
    });

    res.status(200).json({ success: true, message: `Ticket ${issue.ticketId} deleted` });
  } catch (err) {
    next(err);
  }
};
