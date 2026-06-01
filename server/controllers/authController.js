const Gym = require('../models/Gym');
const Owner = require('../models/Owner');
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
      gymIdPrefix, gymName, gst, tagline, address, location, gymEmail, gymContact, socialMediaLinks, gymType, operatingDays, operatingHours, password,
      name, mobileNo, mailId, role = 'Owner',
      whatsappNumber, gmail, phoneNumber,
      billingIdPrefix, helpContact, addressOnBill, regards, greetingText, invoiceSupportEmail
    } = req.body;

    const gymExists = await Gym.findOne({ gymEmail });
    if (gymExists) return res.status(400).json({ success: false, message: 'Gym with this email already exists' });

    const newGymId = await generateGymId();

    const gym = await Gym.create({
      gymId: newGymId,
      gymIdPrefix,
      gymName,
      gst,
      tagline,
      address,
      location,
      gymEmail,
      gymContact,
      socialMediaLinks: parseJsonField(socialMediaLinks, []).filter((item) => item?.platform && item?.url),
      gymType,
      operatingDays: parseJsonField(operatingDays, []),
      operatingHours: parseJsonField(operatingHours, {}),
      password,
      billingInfo: {
        billingIdPrefix,
        helpContact,
        gst,
        logo: buildLogoPath(req.file),
        addressOnBill,
        regards,
        greetingText,
        invoiceSupportEmail: invoiceSupportEmail || ''
      },
      reminderSettings: { whatsappNumber, gmail, phoneNumber }
    });

    const owner = await Owner.create({
      gymId: gym._id,
      name, mobileNo, mailId, role
    });

    res.status(201).json({
      success: true,
      message: 'Gym registered successfully',
      data: { 
        gymId: newGymId,
        gymName: gym.gymName,
        token: generateToken(gym._id, 'owner', { gymId: newGymId, gymName: gym.gymName })
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
    const { email, phone } = req.body;
    let exists = false;
    let message = '';

    if (email) {
      const [gymEmailExists, clientEmailExists, adminEmailExists] = await Promise.all([
        Gym.findOne({ gymEmail: email }).lean(),
        Client.findOne({ 'personalInfo.email': email }).lean(),
        Admin.findOne({ email }).lean()
      ]);

      if (gymEmailExists || clientEmailExists || adminEmailExists) {
        exists = true;
        message = 'Email already exists';
      }
    }

    if (phone && !exists) {
      const [gymPhoneExists, clientPhoneExists] = await Promise.all([
        Gym.findOne({ gymContact: phone }).lean(),
        Client.findOne({ 'personalInfo.mobileNo': phone }).lean()
      ]);

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
      gymId, name, dob, gender, address, email, mobileNo, emergencyContact, medicalCondition, password,
      planId, startDate, planType, customMonths
    } = req.body;

    const gymExists = await Gym.findOne({ gymId });
    if (!gymExists) return res.status(400).json({ success: false, message: 'Gym not found' });

    const clientExists = await Client.findOne({ gymId, 'personalInfo.email': email });
    if (clientExists) return res.status(400).json({ success: false, message: 'Client with this email already registered in this gym' });

    let planName = planType;
    let planDurationMonths = 1;

    if (planType === 'Custom') {
      planDurationMonths = customMonths;
    } else {
      const plan = await Plan.findOne({ _id: planId, gymId, isActive: true });
      if (!plan) return res.status(400).json({ success: false, message: 'Selected plan not found' });
      planName = plan.name;
      planDurationMonths = plan.durationMonths;
    }

    const client = await Client.create({
      gymId,
      gymName: gymExists.gymName,
      personalInfo: { name, dob, gender, address, email, mobileNo, emergencyContact, medicalCondition },
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
      return res.json({
        success: true,
        data: gym,
        token: generateToken(gym._id, 'owner', { gymId: gym.gymId, gymName: gym.gymName }),
        role: 'owner'
      });
    }

    // 3. Check Client
    const clientQuery = isEmail ? { 'personalInfo.email': loginId } : { 'personalInfo.mobileNo': loginId };
    const client = await Client.findOne(clientQuery);
    
    if (client && (await client.matchPassword(password))) {
      if (!client.membership.requestApproved) {
        return res.status(401).json({ success: false, message: 'Your membership is pending approval by the gym owner' });
      }

      return res.json({
        success: true,
        data: client,
        token: generateToken(client._id, 'client'),
        role: 'client'
      });
    }

    // If no match found
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (err) {
    next(err);
  }
};
