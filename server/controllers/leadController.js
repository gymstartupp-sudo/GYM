const Lead = require('../models/Lead');

// @desc    Get all leads for the gym
// @route   GET /api/leads
// @access  Private (Owner, Admin)
exports.getLeads = async (req, res, next) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: leads.length, data: leads });
  } catch (err) {
    next(err);
  }
};

// @desc    Add a new lead
// @route   POST /api/leads
// @access  Private (Owner, Admin)
exports.addLead = async (req, res, next) => {
  try {
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    const Client = require('../models/Client');
    const existingClient = await Client.findOne({ 'personalInfo.mobileNo': phone });
    if (existingClient) {
      return res.status(400).json({ success: false, message: 'This mobile number is already registered to a client.' });
    }

    // Check if lead already exists in this gym by phone
    const existingLead = await Lead.findOne({ phone });
    if (existingLead) {
      return res.status(400).json({ success: false, message: 'A lead with this phone number already exists' });
    }

    const lead = await Lead.create({
      gymId: req.user.gymId, // From protect middleware
      name,
      phone
    });

    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
};

// @desc    Update a lead
// @route   PUT /api/leads/:id
// @access  Private (Owner, Admin)
exports.updateLead = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    let lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (phone && phone !== lead.phone) {
      const Client = require('../models/Client');
      const existingClient = await Client.findOne({ 'personalInfo.mobileNo': phone });
      if (existingClient) {
        return res.status(400).json({ success: false, message: 'This mobile number is already registered to a client.' });
      }

      const existingLead = await Lead.findOne({ phone });
      if (existingLead) {
        return res.status(400).json({ success: false, message: 'A lead with this phone number already exists' });
      }
    }

    lead.name = name || lead.name;
    lead.phone = phone || lead.phone;
    await lead.save();

    res.status(200).json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a lead
// @route   DELETE /api/leads/:id
// @access  Private (Owner, Admin)
exports.deleteLead = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    await lead.deleteOne();
    res.status(200).json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    next(err);
  }
};
