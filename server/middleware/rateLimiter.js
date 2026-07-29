/**
 * rateLimiter.js
 * Enterprise-grade rate limiting middleware.
 * Uses express-rate-limit (v7+) with standardHeaders and no legacyHeaders.
 *
 * Limiters defined here:
 *  - loginLimiter          → POST /api/auth/login
 *  - findGymsLimiter       → POST /api/auth/find-gyms
 *  - forgotPasswordLimiter → POST /api/auth/forgot-password
 *  - otpLimiter            → POST /api/auth/resend-reset-otp
 *  - verifyOtpLimiter      → POST /api/auth/verify-reset-otp
 *  - resetPasswordLimiter  → POST /api/auth/reset-password
 *  - apiLimiter            → All authenticated API routes (general)
 *  - adminLimiter          → /api/admin/* routes
 *  - heavyOperationLimiter → Expensive admin operations (overdue-check, run-reminders)
 *  - heavyConcurrencyGuard → Prevents simultaneous execution of heavy operations
 */

const rateLimit = require('express-rate-limit');

// ─── Shared response builder ──────────────────────────────────────────────────

const tooManyRequestsHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.'
  });
};

// ─── 1. Login ─────────────────────────────────────────────────────────────────
// 5 attempts per IP every 5 minutes

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequestsHandler
});

// ─── 2. Find Gyms ─────────────────────────────────────────────────────────────
// Computationally expensive — searches across all tenant databases.
// 10 requests per IP every 5 minutes.

const findGymsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequestsHandler
});

// ─── 3. Forgot Password ───────────────────────────────────────────────────────
// 5 requests per IP every 15 minutes.

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequestsHandler
});

// ─── 4. Resend OTP ────────────────────────────────────────────────────────────
// 3 requests per IP every 10 minutes.

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequestsHandler
});

// ─── 5. Verify OTP ────────────────────────────────────────────────────────────
// 10 requests per IP every 10 minutes.

const verifyOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequestsHandler
});

// ─── 6. Reset Password ───────────────────────────────────────────────────────
// 5 requests per IP every 15 minutes.

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequestsHandler
});

// ─── 7. General Authenticated API ────────────────────────────────────────────
// 100 requests per IP every 5 minutes.
// Covers: clients, plans, payments, expenses, gym, overdue, feedback, issues.

const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequestsHandler
});

// ─── 8. Admin API ────────────────────────────────────────────────────────────
// 60 requests per IP every 5 minutes.

const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequestsHandler
});

// ─── 9. Heavy Admin Operations ───────────────────────────────────────────────
// 20 requests per IP every 5 minutes.
// Used on: /api/admin/overdue-check, /api/admin/run-reminders

const heavyOperationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequestsHandler
});

// ─── 10. Heavy Operation Concurrency Guard ───────────────────────────────────
// Prevents two expensive jobs from running at the same time.
// If a job is already running, returns HTTP 409 immediately.

let isHeavyOperationRunning = false;

const heavyConcurrencyGuard = (req, res, next) => {
  if (isHeavyOperationRunning) {
    return res.status(409).json({
      success: false,
      message: 'A reminder check is already in progress. Please wait until it finishes.'
    });
  }

  isHeavyOperationRunning = true;

  // Hook into res.end to release the lock when the response finishes
  const originalEnd = res.end.bind(res);
  res.end = (...args) => {
    isHeavyOperationRunning = false;
    return originalEnd(...args);
  };

  // Safety fallback: if the request hangs for more than 5 minutes, release lock
  const fallbackTimeout = setTimeout(() => {
    isHeavyOperationRunning = false;
  }, 5 * 60 * 1000);

  res.on('finish', () => clearTimeout(fallbackTimeout));
  res.on('close', () => {
    clearTimeout(fallbackTimeout);
    isHeavyOperationRunning = false;
  });

  next();
};

module.exports = {
  loginLimiter,
  findGymsLimiter,
  forgotPasswordLimiter,
  otpLimiter,
  verifyOtpLimiter,
  resetPasswordLimiter,
  apiLimiter,
  adminLimiter,
  heavyOperationLimiter,
  heavyConcurrencyGuard
};
