const Gym = require('../models/Gym');
const Client = require('../models/Client');
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const { generateGymId, generateClientId } = require('../utils/generateId');
const Plan = require('../models/Plan');
const { isValidExternalUrl } = require('../middleware/validate');

const parseJsonField = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const buildLogoPath = (file) => file ? `/uploads/logos/${file.filename}` : '';

const generateToken = (id, role, extra = {}) => {
  return jwt.sign({ id, role, ...extra }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

// @desc    Register a new Gym Owner
// @route   POST /api/auth/gym/register
// @access  Public
exports.registerGymOwner = async (req, res, next) => {
  try {
    const {
      gymName, gst, tagline, address, state, city, pincode, gymEmail, gymContact, socialMediaLinks, gymType, operatingDays, operatingHours, password,
      name, mobileNo, mailId,
      whatsappNumber, gmail, phoneNumber,
      billingIdPrefix, helpContact, addressOnBill, regards, greetingText
    } = req.body;

    // Check if gym email already exists
    const emailExists = await Gym.findOne({ gymEmail });
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Gym with this email already exists' });
    }

    // Check if gym contact number already exists
    const contactExists = await Gym.findOne({ gymContact });
    if (contactExists) {
      return res.status(400).json({ success: false, message: 'Gym with this contact number already exists' });
    }

    let logoUrl = '';
    if (req.file) {
      try {
        const { uploadLogoToCloudinary } = require('../utils/cloudinary');
        logoUrl = await uploadLogoToCloudinary(req.file.path);
      } catch (uploadErr) {
        console.error('Failed to upload logo to Cloudinary during registration:', uploadErr);
        return res.status(500).json({ success: false, message: 'Failed to upload gym logo to cloud storage' });
      }
    }

    const newGymId = await generateGymId();
    const dbName = `gym_${newGymId.replace('-', '_')}`;

    const parsedSocialMediaLinks = parseJsonField(socialMediaLinks, [])
      .filter((item) => item?.platform && item?.url && isValidExternalUrl(item.url));
    const parsedOperatingDays = parseJsonField(operatingDays, []);
    const parsedOperatingHours = parseJsonField(operatingHours, {});

    if (!Array.isArray(parsedOperatingDays) || parsedOperatingDays.length === 0) {
      return res.status(400).json({ success: false, message: 'Operating days are required' });
    }

    if (!parsedOperatingHours || !parsedOperatingHours.open || !parsedOperatingHours.close) {
      return res.status(400).json({ success: false, message: 'Operating hours (open & close times) are required' });
    }

    const gym = await Gym.create({
      gymId: newGymId,
      dbName,
      gymName,
      gymEmail,
      gymContact,
      password,
      owner: {
        name,
        email: mailId,
        mobile: mobileNo,
        phone: mobileNo
      },
      address,
      city,
      state,
      pincode,
      gst: gst || "",
      gymLogo: logoUrl || "",
      tagline: tagline || "",
      gymType: gymType || "",
      operatingDays: parsedOperatingDays,
      operatingHours: parsedOperatingHours,
      billingInfo: {
        billingIdPrefix: billingIdPrefix || "BILL",
        helpContact: helpContact || "",
        addressOnBill: addressOnBill || "",
        regards: regards || "",
        greetingText: greetingText || "",
        allowPartialPayments: true
      },
      reminderSettings: {
        whatsappNumber: whatsappNumber || "",
        gmail: gmail || "",
        phoneNumber: phoneNumber || ""
      },
      socialMediaLinks: parsedSocialMediaLinks,
      status: 'Active',
      subscription: 'Premium',
      isActive: true
    });

    // Automatically create database and initialize collections
    const { getTenantConnection } = require('../utils/connectionManager');
    const conn = await getTenantConnection(dbName);

    await conn.createCollection('clients');
    await conn.createCollection('plans');
    await conn.createCollection('payments');
    await conn.createCollection('expenses');
    await conn.createCollection('feedbacks');
    await conn.createCollection('counters');
    await conn.createCollection('settings');

    const TenantSetting = conn.model('Setting');
    await TenantSetting.create({
      partialPayment: {
        enabled: true,
        minimumPercentage: 50
      },
      dueSettings: {
        defaultDaysFor1To6Months: 15,
        defaultDaysAbove6Months: 30,
        allowCustomDueDays: true,
        customPlanDueDays: {
          "1 Month": 15,
          "2 Months": 15,
          "3 Months": 15,
          "6 Months": 15,
          "12 Months": 30
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Gym registered successfully',
      data: {
        gymId: newGymId,
        gymName: gym.gymName,
        token: generateToken(gym._id, 'owner', { gymId: newGymId, gymName: gym.gymName, dbName })
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.checkExists = async (req, res, next) => {
  try {
    const { email, phone, gymId } = req.body;
    let exists = false;
    let message = '';
    const { getTenantConnection } = require('../utils/connectionManager');

    if (gymId) {
      // Client Registration path: Check ONLY in the specific tenant's database
      try {
        const gym = await Gym.findOne({ gymId: gymId.trim().toUpperCase() }).lean();
        if (gym) {
          const conn = await getTenantConnection(gym.dbName);
          const TenantClient = conn.model('Client');
          
          let emailConflict = null;
          let phoneConflict = null;

          if (email) {
            emailConflict = await TenantClient.findOne({ 'personalInfo.email': email }).lean();
          }
          if (phone) {
            phoneConflict = await TenantClient.findOne({ 'personalInfo.mobileNo': phone }).lean();
          }

          if (emailConflict || phoneConflict) {
            const conflictData = emailConflict || phoneConflict;
            const duplicateFields = [];
            if (emailConflict) duplicateFields.push('email');
            if (phoneConflict) duplicateFields.push('phone');

            return res.status(409).json({
              success: false,
              message: duplicateFields.map(f => f === 'email' ? 'Email already exists' : 'Phone number already exists').join(' and '),
              duplicateFields,
              exists: true,
              isDeleted: conflictData.isDeleted === true,
              isExpired: conflictData.membership?.endDate
                ? new Date(conflictData.membership.endDate) < new Date()
                : true,
              deletedAt: conflictData.isDeleted === true ? conflictData.deletedAt : undefined
            });
          }
        }
      } catch (err) {
        console.error(`checkExists tenant check error:`, err);
      }
    } else {
      // Gym Owner / Admin registration path: Check globally
      let emailExists = false;
      let phoneExists = false;

      if (email) {
        const [gymEmailExists, adminEmailExists] = await Promise.all([
          Gym.findOne({ gymEmail: email }).lean(),
          Admin.findOne({ email }).lean()
        ]);
        if (gymEmailExists || adminEmailExists) {
          emailExists = true;
        }
      }
      if (phone) {
        const gymPhoneExists = await Gym.findOne({ gymContact: phone }).lean();
        if (gymPhoneExists) {
          phoneExists = true;
        }
      }
      
      if (emailExists || phoneExists) {
        const duplicateFields = [];
        if (emailExists) duplicateFields.push('email');
        if (phoneExists) duplicateFields.push('phone');

        return res.status(409).json({
          success: false,
          message: duplicateFields.map(f => f === 'email' ? 'Email already exists' : 'Phone number already exists').join(' and '),
          duplicateFields
        });
      }
    }

    res.status(200).json({ success: true, message: 'Available' });
  } catch (err) {
    next(err);
  }
};

// @desc    Register a new Client
// @route   POST /api/auth/client/register
// @access  Public
exports.registerClient = async (req, res, next) => {
  try {
    const {
      gymId, name, dob, gender, address, city, state, pincode, email, mobileNo, emergencyContact, medicalCondition, password,
      planId, startDate, planType, customMonths
    } = req.body;

    const gymExists = await Gym.findOne({ gymId });
    if (!gymExists) return res.status(400).json({ success: false, message: 'Gym not found' });

    const clientExists = await Client.findOne({
      $or: [
        { 'personalInfo.email': email },
        { 'personalInfo.mobileNo': mobileNo }
      ]
    });
    if (clientExists) {
      const isEmail = clientExists.personalInfo.email === email;
      return res.status(400).json({
        success: false,
        message: isEmail
          ? 'Client with this email already registered in this gym'
          : 'Client with this mobile number already registered in this gym'
      });
    }

    let planName = planType;
    let planDurationMonths = 1;

    if (planType === 'Custom') {
      planDurationMonths = customMonths;
    } else {
      const plan = await Plan.findOne({ _id: planId, isActive: true });
      if (!plan) return res.status(400).json({ success: false, message: 'Selected plan not found' });
      planName = plan.name;
      planDurationMonths = plan.durationMonths;
    }

    const client = await Client.create({
      gymId,
      gymName: gymExists.gymName,
      personalInfo: { name, dob, gender, address, city, state, pincode, email, mobileNo, emergencyContact, medicalCondition },
      password,
      membership: {
        planId: planType === 'Custom' ? null : planId,
        planName,
        planDurationMonths,
        durationMonths: planDurationMonths, // backward compat
        customMonths: planType === 'Custom' ? customMonths : undefined,
        startDate,
        status: 'pending',
        requestApproved: false
      },
      avatar: name.charAt(0).toUpperCase()
    });

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully',
      data: { client }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Universal Login
// @route   POST /api/auth/login
// @access  Public
exports.universalLogin = async (req, res, next) => {
  try {
    const { loginId, password, gymId, role } = req.body;
    const isEmail = loginId.includes('@');
    const { getTenantConnection } = require('../utils/connectionManager');

    // If gymId and role are provided, perform direct, optimized lookup
    if (gymId && role) {
      if (role === 'superadmin') {
        if (isEmail) {
          const admin = await Admin.findOne({ email: loginId });
          if (admin && (await admin.matchPassword(password))) {
            return res.json({
              success: true,
              data: { email: admin.email, role: admin.role },
              token: generateToken(admin._id, 'superadmin'),
              role: admin.role
            });
          }
        }
      } else if (role === 'owner') {
        const gymQuery = isEmail
          ? { gymEmail: loginId, gymId }
          : { gymContact: loginId, gymId };
        const gym = await Gym.findOne(gymQuery);
        if (gym && (await gym.matchPassword(password))) {
          if (!gym.isActive) {
            return res.status(403).json({
              success: false,
              message: 'Your gym account has been deactivated. Please contact the administrator.'
            });
          }
          return res.json({
            success: true,
            data: gym,
            token: generateToken(gym._id, 'owner', { gymId: gym.gymId, gymName: gym.gymName, dbName: gym.dbName }),
            role: 'owner'
          });
        }
      } else if (role === 'client') {
        const clientGym = await Gym.findOne({ gymId });
        if (clientGym) {
          const clientQuery = isEmail ? { 'personalInfo.email': loginId } : { 'personalInfo.mobileNo': loginId };
          const conn = await getTenantConnection(clientGym.dbName);
          const TenantClient = conn.model('Client');
          const client = await TenantClient.findOne(clientQuery);
          if (client && (await client.matchPassword(password))) {
            if (clientGym.isActive === false) {
              return res.status(403).json({
                success: false,
                message: 'Your gym account has been suspended. Please contact your gym owner.'
              });
            }

            if (!client.membership.requestApproved) {
              return res.status(401).json({ success: false, message: 'Your membership is pending approval by the gym owner' });
            }

            return res.json({
              success: true,
              data: client,
              token: generateToken(client._id, 'client', { gymId: client.gymId, dbName: clientGym.dbName }),
              role: 'client'
            });
          }
        }
      }
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Fallback: Perform sequential lookup (old logic)
    // 1. Check Admin
    if (isEmail) {
      const admin = await Admin.findOne({ email: loginId });
      if (admin && (await admin.matchPassword(password))) {
        return res.json({
          success: true,
          data: { email: admin.email, role: admin.role },
          token: generateToken(admin._id, 'superadmin'),
          role: admin.role
        });
      }
    }

    // 2. Check Gym
    const gymQuery = isEmail ? { gymEmail: loginId } : { gymContact: loginId };
    const gym = await Gym.findOne(gymQuery);
    if (gym && (await gym.matchPassword(password))) {
      if (!gym.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your gym account has been deactivated. Please contact the administrator.'
        });
      }
      return res.json({
        success: true,
        data: gym,
        token: generateToken(gym._id, 'owner', { gymId: gym.gymId, gymName: gym.gymName, dbName: gym.dbName }),
        role: 'owner'
      });
    }

    // 3. Check Client (Dynamic lookup across tenant databases)
    const clientQuery = isEmail ? { 'personalInfo.email': loginId } : { 'personalInfo.mobileNo': loginId };
    const gyms = await Gym.find({ isActive: true }).lean();
    let foundClient = null;
    let clientGym = null;

    const loginResults = await Promise.all(
      gyms.map(async (g) => {
        try {
          const conn = await getTenantConnection(g.dbName);
          const TenantClient = conn.model('Client');
          const client = await TenantClient.findOne(clientQuery);
          if (client && (await client.matchPassword(password))) {
            return { client, gym: g };
          }
        } catch (err) {
          console.error(`universalLogin search client error in tenant ${g.dbName}:`, err);
        }
        return null;
      })
    );

    for (const result of loginResults) {
      if (result) {
        foundClient = result.client;
        clientGym = result.gym;
        break;
      }
    }

    if (foundClient && clientGym) {
      if (clientGym.isActive === false) {
        return res.status(403).json({
          success: false,
          message: 'Your gym account has been suspended. Please contact your gym owner.'
        });
      }

      if (!foundClient.membership.requestApproved) {
        return res.status(401).json({ success: false, message: 'Your membership is pending approval by the gym owner' });
      }

      return res.json({
        success: true,
        data: foundClient,
        token: generateToken(foundClient._id, 'client', { gymId: foundClient.gymId, dbName: clientGym.dbName }),
        role: 'client'
      });
    }

    res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (err) {
    next(err);
  }
};

// @desc    Find Gyms/Portals matching loginId
// @route   POST /api/auth/find-gyms
// @access  Public
exports.findGyms = async (req, res, next) => {
  try {
    const { loginId } = req.body;
    if (!loginId) {
      return res.status(400).json({ success: false, message: 'Email or Phone is required' });
    }

    const isEmail = loginId.includes('@');
    const { getTenantConnection } = require('../utils/connectionManager');
    const matchingGyms = [];

    // 1. Check if loginId belongs to Admin
    if (isEmail) {
      const admin = await Admin.findOne({ email: loginId }).lean();
      if (admin) {
        matchingGyms.push({
          gymId: 'admin',
          gymName: 'Super Admin Portal',
          role: 'superadmin'
        });
      }
    }

    // 2. Check if loginId belongs to a Gym Owner
    const gymQuery = isEmail ? { gymEmail: loginId } : { gymContact: loginId };
    const gym = await Gym.findOne(gymQuery).lean();
    if (gym) {
      matchingGyms.push({
        gymId: gym.gymId,
        gymName: gym.gymName,
        role: 'owner'
      });
    }

    // 3. Check if loginId belongs to Client in tenant databases
    const clientQuery = isEmail ? { 'personalInfo.email': loginId } : { 'personalInfo.mobileNo': loginId };
    const gymsList = await Gym.find({ isActive: true }).lean();

    const clientGyms = await Promise.all(
      gymsList.map(async (g) => {
        try {
          const conn = await getTenantConnection(g.dbName);
          const TenantClient = conn.model('Client');
          const client = await TenantClient.findOne(clientQuery).lean();
          if (client) {
            return {
              gymId: g.gymId,
              gymName: g.gymName,
              role: 'client'
            };
          }
        } catch (err) {
          console.error(`findGyms search client error in tenant ${g.dbName}:`, err);
        }
        return null;
      })
    );

    for (const cg of clientGyms) {
      if (cg) {
        matchingGyms.push(cg);
      }
    }

    if (matchingGyms.length === 0) {
      return res.status(404).json({ success: false, message: 'No accounts found for this email or phone number' });
    }

    res.json({
      success: true,
      gyms: matchingGyms
    });
  } catch (err) {
    next(err);
  }
};

// --- Forgot Password Flow ---

const forgotPasswordLimiter = new Map();
const checkRateLimit = (ip, limitTimeMs, maxRequests) => {
  const now = Date.now();
  if (!forgotPasswordLimiter.has(ip)) {
    forgotPasswordLimiter.set(ip, []);
  }
  const requests = forgotPasswordLimiter.get(ip).filter(t => now - t < limitTimeMs);
  if (requests.length >= maxRequests) {
    return false;
  }
  requests.push(now);
  forgotPasswordLimiter.set(ip, requests);
  return true;
};

// @desc    Request Password Reset Verification OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    // Rate limit: 5 requests per 15 minutes
    if (!checkRateLimit(ip, 15 * 60 * 1000, 5)) {
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again after 15 minutes.' });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address' });
    }

    console.log(`\nForgot Password Request\n\n↓\n\nVerification Method: Email`);

    let userExists = false;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    // Search email in Admin
    const admin = await Admin.findOne({ email }).lean();
    userExists = !!admin;

    // Search email in Gym (Owner)
    if (!userExists) {
      const gym = await Gym.findOne({ gymEmail: email }).lean();
      userExists = !!gym;
    }

    // Search email in Client across tenant databases
    if (!userExists) {
      const { getTenantConnection } = require('../utils/connectionManager');
      const gymsList = await Gym.find({ isActive: true }).lean();
      const results = await Promise.all(
        gymsList.map(async (g) => {
          try {
            const conn = await getTenantConnection(g.dbName);
            const TenantClient = conn.model('Client');
            const client = await TenantClient.findOne({ 'personalInfo.email': email }).lean();
            return !!client;
          } catch (err) {
            console.error(`forgotPassword client check error in tenant ${g.dbName}:`, err);
            return false;
          }
        })
      );
      userExists = results.some(exists => exists);
    }

    const genericMessage = 'If an account exists with this email, a verification code has been sent.';

    if (!userExists) {
      // Return generic message to prevent account enumeration
      return res.status(200).json({ success: true, message: genericMessage });
    }

    // Generate secure 6-digit numeric OTP
    const crypto = require('crypto');
    const otp = crypto.randomInt(100000, 999999).toString();
    const bcrypt = require('bcryptjs');
    const otpHash = await bcrypt.hash(otp, 10);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const PasswordResetOTP = require('../models/PasswordResetOTP');

    // Invalidate/delete any previous OTP for this email
    await PasswordResetOTP.deleteMany({ email });

    // Store OTP in database
    await PasswordResetOTP.create({
      email,
      otpHash,
      expiresAt
    });
    console.log(`[TEST DEBUG] Generated OTP for ${email}: ${otp}`);
    console.log(`\n↓\n\nOTP Generated`);

    // Send OTP via Nodemailer
    const sendEmail = require('../utils/sendEmail');
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #E2E2DC; border-radius: 16px; background-color: #111111; color: #FFFFFF;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #2A2A2A;">
          <h2 style="color: #FFBD07; margin: 0; font-size: 28px;">Gym Management</h2>
        </div>
        <div style="padding: 20px 10px;">
          <h3 style="color: #FFFFFF; font-size: 20px;">Password Reset Request</h3>
          <p style="color: #BDBDBD; font-size: 14px; line-height: 1.5;">Hello,</p>
          <p style="color: #BDBDBD; font-size: 14px; line-height: 1.5;">We received a request to reset your password. Use the verification code below to proceed:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; font-size: 36px; font-weight: bold; letter-spacing: 5px; color: #FFBD07; background-color: #1F1F1F; padding: 12px 30px; border-radius: 8px; border: 1px solid #FFBD07;">
              ${otp}
            </span>
          </div>
          <p style="color: #BDBDBD; font-size: 13px; line-height: 1.5; font-style: italic;">Note: This verification code is only valid for 10 minutes. If you did not request a password reset, please ignore this email.</p>
        </div>
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #2A2A2A; color: #8A8A8A; font-size: 12px;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} Gym Management Platform. All rights reserved.</p>
        </div>
      </div>
    `;

    // Send OTP in background without awaiting it to keep response time instant (< 100ms)
    sendEmail({
      email,
      subject: 'Gym Management Password Reset',
      message: `Your verification code is ${otp}. It is valid for 5 minutes.`,
      html: htmlTemplate
    })
      .then(() => console.log('Email sent successfully in background'))
      .catch((mailErr) => console.error('[TEST DEBUG] Background email dispatch failed:', mailErr.message));

    res.status(200).json({ success: true, message: genericMessage });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify OTP for Password Reset
// @route   POST /api/auth/verify-reset-otp
// @access  Public
exports.verifyResetOtp = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    // Rate limit: 5 requests per 15 minutes
    if (!checkRateLimit(ip, 15 * 60 * 1000, 5)) {
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again after 15 minutes.' });
    }

    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and verification code are required' });
    }

    const PasswordResetOTP = require('../models/PasswordResetOTP');

    // Find entry
    const resetEntry = await PasswordResetOTP.findOne({ email, verified: false });

    if (!resetEntry) {
      return res.status(400).json({ success: false, message: 'Verification code has expired or is invalid' });
    }

    if (new Date() > resetEntry.expiresAt) {
      await PasswordResetOTP.deleteOne({ _id: resetEntry._id });
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
    }

    // Lockout after 5 invalid attempts
    if (resetEntry.attempts >= 5) {
      return res.status(400).json({ success: false, message: 'Too many invalid attempts. This code is locked. Please request a new one.' });
    }

    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(otp, resetEntry.otpHash);

    if (!isMatch) {
      resetEntry.attempts += 1;
      await resetEntry.save();
      const remainingAttempts = 5 - resetEntry.attempts;

      if (remainingAttempts <= 0) {
        return res.status(400).json({ success: false, message: 'Too many invalid attempts. This code is locked. Please request a new one.' });
      }
      return res.status(400).json({ success: false, message: `Invalid verification code. ${remainingAttempts} attempts remaining.` });
    }

    // Set as verified
    resetEntry.verified = true;
    await resetEntry.save();
    console.log(`\n↓\n\nOTP Verified`);

    res.status(200).json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Resend Password Reset OTP
// @route   POST /api/auth/resend-reset-otp
// @access  Public
exports.resendResetOtp = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    // Rate limit: 5 requests per 15 minutes
    if (!checkRateLimit(ip, 15 * 60 * 1000, 5)) {
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again after 15 minutes.' });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    const PasswordResetOTP = require('../models/PasswordResetOTP');
    const existingEntry = await PasswordResetOTP.findOne({ email });

    // Enforce 60-second resend limit
    if (existingEntry) {
      const secondsSinceLast = (Date.now() - new Date(existingEntry.createdAt).getTime()) / 1000;
      if (secondsSinceLast < 60) {
        const secondsRemaining = Math.ceil(60 - secondsSinceLast);
        return res.status(429).json({ success: false, message: `Please wait ${secondsRemaining} seconds before requesting a new code.` });
      }
    }

    // Generate secure 6-digit numeric OTP
    const crypto = require('crypto');
    const otp = crypto.randomInt(100000, 999999).toString();
    const bcrypt = require('bcryptjs');
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Delete old entries immediately
    await PasswordResetOTP.deleteMany({ email });

    // Store new OTP
    await PasswordResetOTP.create({ email, otpHash, expiresAt });
    console.log(`[TEST DEBUG] Resent OTP for ${email}: ${otp}`);

    const genericMessage = 'If an account exists with this email, a verification code has been sent.';

    // Send OTP email
    const sendEmail = require('../utils/sendEmail');
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #E2E2DC; border-radius: 16px; background-color: #111111; color: #FFFFFF;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #2A2A2A;">
          <h2 style="color: #FFBD07; margin: 0; font-size: 28px;">Gym Management</h2>
        </div>
        <div style="padding: 20px 10px;">
          <h3 style="color: #FFFFFF; font-size: 20px;">Password Reset Request</h3>
          <p style="color: #BDBDBD; font-size: 14px; line-height: 1.5;">Hello,</p>
          <p style="color: #BDBDBD; font-size: 14px; line-height: 1.5;">Here is your new verification code to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; font-size: 36px; font-weight: bold; letter-spacing: 5px; color: #FFBD07; background-color: #1F1F1F; padding: 12px 30px; border-radius: 8px; border: 1px solid #FFBD07;">
              ${otp}
            </span>
          </div>
          <p style="color: #BDBDBD; font-size: 13px; line-height: 1.5; font-style: italic;">Note: This verification code is only valid for 10 minutes. If you did not request a password reset, please ignore this email.</p>
        </div>
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #2A2A2A; color: #8A8A8A; font-size: 12px;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} Gym Management Platform. All rights reserved.</p>
        </div>
      </div>
    `;

    // Send OTP in background without awaiting it to keep response time instant (< 100ms)
    sendEmail({
      email,
      subject: 'Gym Management Password Reset',
      message: `Your new verification code is ${otp}. It is valid for 10 minutes.`,
      html: htmlTemplate
    })
      .then(() => console.log('Resent email sent successfully in background'))
      .catch((mailErr) => console.error('[TEST DEBUG] Background resent email dispatch failed:', mailErr.message));

    res.status(200).json({ success: true, message: genericMessage });
  } catch (err) {
    next(err);
  }
};

// @desc    Reset Password with Verified Token
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and new password are required' });
    }

    // Password validation rules
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters, and contain uppercase, lowercase, a number, and a special character.'
      });
    }

    // Verify OTP was verified successfully
    const PasswordResetOTP = require('../models/PasswordResetOTP');
    const resetEntry = await PasswordResetOTP.findOne({ email, verified: true });

    if (!resetEntry) {
      return res.status(400).json({ success: false, message: 'Verification session has expired or is invalid. Please start over.' });
    }

    // Update password for all matching user accounts across all models
    let userUpdated = false;

    // 1. Check Admin
    const admin = await Admin.findOne({ email });
    if (admin) {
      admin.password = password;
      await admin.save();
      userUpdated = true;
    }

    // 2. Check Gym (Owner)
    const gym = await Gym.findOne({ gymEmail: email });
    if (gym) {
      gym.password = password;
      await gym.save();
      userUpdated = true;
    }

    // 3. Check Clients across all tenant databases
    const { getTenantConnection } = require('../utils/connectionManager');
    const gymsList = await Gym.find({ isActive: true }).lean();
    const results = await Promise.all(
      gymsList.map(async (g) => {
        try {
          const conn = await getTenantConnection(g.dbName);
          const TenantClient = conn.model('Client');
          const client = await TenantClient.findOne({ 'personalInfo.email': email });
          if (client) {
            client.password = password;
            await client.save();
            return true;
          }
        } catch (err) {
          console.error(`resetPassword client save error in tenant ${g.dbName}:`, err);
        }
        return false;
      })
    );
    if (results.some(updated => updated)) {
      userUpdated = true;
    }

    if (!userUpdated) {
      return res.status(404).json({
        success: false,
        message: 'No accounts associated with this email were found.'
      });
    }

    // Clean up OTP entries
    await PasswordResetOTP.deleteMany({ email });
    console.log(`\n↓\n\nPassword Updated\n\n↓\n\nCompleted`);

    res.status(200).json({ success: true, message: 'Password changed successfully. Please login.' });
  } catch (err) {
    next(err);
  }
};
