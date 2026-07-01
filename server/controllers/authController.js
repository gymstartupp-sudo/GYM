const Gym = require('../models/Gym');
const Client = require('../models/Client');
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const { generateGymId, generateClientId } = require('../utils/generateId');
const Plan = require('../models/Plan');

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
  return jwt.sign({ id, role, ...extra }, process.env.JWT_SECRET, { expiresIn: '7d' });
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

    const gymExists = await Gym.findOne({ gymEmail });
    if (gymExists) return res.status(400).json({ success: false, message: 'Gym with this email already exists' });

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

    const parsedSocialMediaLinks = parseJsonField(socialMediaLinks, []).filter((item) => item?.platform && item?.url);
    const parsedOperatingDays = parseJsonField(operatingDays, []);
    const parsedOperatingHours = parseJsonField(operatingHours, {});

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

// @desc    Check if email or phone exists
// @route   POST /api/auth/check-exists
// @access  Public
exports.checkExists = async (req, res, next) => {
  try {
    const { email, phone, gymId } = req.body;
    let exists = false;
    let message = '';
    const { getTenantConnection } = require('../utils/connectionManager');

    if (email) {
      let clientEmailExists = null;
      if (gymId) {
        try {
          const gym = await Gym.findOne({ gymId }).lean();
          if (gym) {
            const conn = await getTenantConnection(gym.dbName);
            const TenantClient = conn.model('Client');
            clientEmailExists = await TenantClient.findOne({ 'personalInfo.email': email }).lean();
          }
        } catch (err) {
          console.error(`checkExists email check error:`, err);
        }
      }

      const [gymEmailExists, adminEmailExists] = await Promise.all([
        Gym.findOne({ gymEmail: email }).lean(),
        Admin.findOne({ email }).lean()
      ]);

      if (gymEmailExists || clientEmailExists || adminEmailExists) {
        exists = true;
        message = 'Email already exists';
      }
    }

    if (phone && !exists) {
      let clientPhoneExists = null;
      if (gymId) {
        try {
          const gym = await Gym.findOne({ gymId }).lean();
          if (gym) {
            const conn = await getTenantConnection(gym.dbName);
            const TenantClient = conn.model('Client');
            clientPhoneExists = await TenantClient.findOne({ 'personalInfo.mobileNo': phone }).lean();
          }
        } catch (err) {
          console.error(`checkExists phone check error:`, err);
        }
      }

      const gymPhoneExists = await Gym.findOne({ gymContact: phone }).lean();

      if (gymPhoneExists || clientPhoneExists) {
        exists = true;
        message = 'Phone number already exists';
      }
    }

    if (exists) {
      return res.status(409).json({ success: false, message });
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
    const { loginId, password } = req.body;
    const isEmail = loginId.includes('@');
    const { getTenantConnection } = require('../utils/connectionManager');

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

    for (const g of gyms) {
      try {
        const conn = await getTenantConnection(g.dbName);
        const TenantClient = conn.model('Client');
        const client = await TenantClient.findOne(clientQuery);
        if (client && (await client.matchPassword(password))) {
          foundClient = client;
          clientGym = g;
          break;
        }
      } catch (err) {
        console.error(`universalLogin search client error in tenant ${g.dbName}:`, err);
      }
    }
    
    if (foundClient && clientGym) {
      // Block login if client's gym has been deactivated by admin
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

    // If no match found
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (err) {
    next(err);
  }
};
