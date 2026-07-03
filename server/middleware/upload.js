const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');

const uploadRoot = path.join(__dirname, '..', 'uploads', 'logos');

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadRoot);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const safeName = file.originalname
      .replace(extension, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);

    cb(null, `${Date.now()}-${safeName || 'logo'}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'));
  }

  cb(null, true);
};

const uploadLogo = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const billStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'bills');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    cb(null, `bill-${Date.now()}${extension}`);
  }
});

const uploadBill = multer({
  storage: billStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ─── Issue Screenshots & Video ───────────────────────────────────────────────
const issueRoot = path.join(__dirname, '..', 'uploads', 'issues');
if (!fs.existsSync(issueRoot)) fs.mkdirSync(issueRoot, { recursive: true });

const issueStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, issueRoot),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const rand = crypto.randomBytes(8).toString('hex');
    cb(null, `issue-${Date.now()}-${rand}${ext}`);
  }
});

const issueFileFilter = (req, file, cb) => {
  const isImage = file.mimetype.startsWith('image/');
  const isVideo = file.mimetype.startsWith('video/');
  if (!isImage && !isVideo) return cb(new Error('Only image or video files are allowed'));
  cb(null, true);
};

const uploadIssueFiles = multer({
  storage: issueStorage,
  fileFilter: issueFileFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 6 } // 5 screenshots + 1 video
});

module.exports = { uploadLogo, uploadBill, uploadIssueFiles };
