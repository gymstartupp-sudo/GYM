const CustomMessageCampaign = require('../models/CustomMessageCampaign');
const Client = require('../models/Client');
const Lead = require('../models/Lead');
const { getTenantConnection } = require('../utils/connectionManager');
const { runWithTenantContext } = require('../utils/tenantContext');
const { uploadCustomMessageMediaToCloudinary } = require('../utils/cloudinary');
const { sendCustomTemplateMessage } = require('../services/metaWhatsAppService');

// Helper to validate and format Indian mobile numbers
const getValidWhatsAppNumber = (rawNum) => {
  if (!rawNum) return null;
  let cleaned = String(rawNum).replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  }
  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (indianMobileRegex.test(cleaned)) {
    return cleaned; // returns 10 digit clean string
  }
  return null;
};

// Async background processor for sending messages safely
const processMessageCampaign = async (campaignId, gymId, dbName, recipients) => {
  try {
    const conn = await getTenantConnection(dbName);
    const CampaignModel = conn.models.CustomMessageCampaign || conn.model('CustomMessageCampaign', CustomMessageCampaign.schema);

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const cleanMobile = getValidWhatsAppNumber(recipient.phone);
      
      if (!cleanMobile) {
        await updateRecipientStatus(CampaignModel, campaignId, recipient.recipientId, 'failed', null, 'Invalid phone number');
        continue;
      }
      
      const formattedWhatsApp = `+91${cleanMobile}`;
      
      let campaignRecord;
      await runWithTenantContext({ tenantDb: conn, models: { CustomMessageCampaign: CampaignModel } }, async () => {
        campaignRecord = await CampaignModel.findById(campaignId);
      });
      
      if (!campaignRecord) break;
      
      const mediaType = campaignRecord.templateName === 'msg_video' ? 'video' : (campaignRecord.templateName === 'msg_imag' ? 'image' : null);

      const result = await sendCustomTemplateMessage({
        phone: formattedWhatsApp,
        templateName: campaignRecord.templateName,
        messageContent: campaignRecord.messageContent,
        mediaUrl: campaignRecord.mediaUrl,
        mediaType: mediaType,
        clientId: recipient.recipientId,
        gymId: gymId
      });

      if (result.success) {
        await updateRecipientStatus(CampaignModel, campaignId, recipient.recipientId, 'sent', result.messageId, null);
      } else {
        await updateRecipientStatus(CampaignModel, campaignId, recipient.recipientId, 'failed', null, result.error);
      }
      
      // Delay to respect WhatsApp API rate limits (e.g., 20 msgs/sec = 50ms delay, we'll use 100ms for safety)
      await new Promise(res => setTimeout(res, 100));
    }

    // Mark campaign as completed
    await runWithTenantContext({ tenantDb: conn, models: { CustomMessageCampaign: CampaignModel } }, async () => {
      await CampaignModel.findByIdAndUpdate(campaignId, { status: 'completed' });
    });

  } catch (err) {
    console.error(`[CAMPAIGN PROCESSOR ERROR] ${err.message}`, err);
    try {
      const conn = await getTenantConnection(dbName);
      const CampaignModel = conn.models.CustomMessageCampaign || conn.model('CustomMessageCampaign', CustomMessageCampaign.schema);
      await runWithTenantContext({ tenantDb: conn, models: { CustomMessageCampaign: CampaignModel } }, async () => {
        await CampaignModel.findByIdAndUpdate(campaignId, { status: 'failed' });
      });
    } catch(e) {}
  }
};

const updateRecipientStatus = async (CampaignModel, campaignId, recipientId, status, messageId, error) => {
  await CampaignModel.updateOne(
    { _id: campaignId, 'recipients.recipientId': recipientId },
    {
      $set: {
        'recipients.$.status': status,
        'recipients.$.providerMessageId': messageId,
        'recipients.$.error': error,
        'recipients.$.sentAt': status === 'sent' ? new Date() : null
      }
    }
  );
};

exports.sendCampaign = async (req, res) => {
  try {
    const { gymId, dbName } = req.user;
    if (!gymId || !dbName) {
      return res.status(400).json({ success: false, message: 'Gym ID not found in request context' });
    }

    const { templateName, messageContent, audienceType, selectedIds } = req.body;
    let recipientIds = [];
    if (selectedIds) {
      try {
        recipientIds = JSON.parse(selectedIds);
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid selectedIds format' });
      }
    }

    if (!templateName || !messageContent || !audienceType) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    let mediaUrl = null;
    if (req.file) {
      const isVideo = req.file.mimetype.startsWith('video');
      mediaUrl = await uploadCustomMessageMediaToCloudinary(req.file.path, isVideo ? 'video' : 'image');
    }

    if ((templateName === 'msg_imag' || templateName === 'msg_video') && !mediaUrl) {
      return res.status(400).json({ success: false, message: 'Media file is required for this template' });
    }

    // Fetch recipients
    const conn = await getTenantConnection(dbName);
    const ClientModel = conn.models.Client || conn.model('Client', Client.schema);
    const LeadModel = conn.models.Lead || conn.model('Lead', Lead.schema);
    
    let recipientsList = [];

    await runWithTenantContext({ tenantDb: conn, models: { Client: ClientModel, Lead: LeadModel } }, async () => {
      let filter = {};
      if (audienceType === 'selected') {
         // Could be mixed leads and clients, assuming client IDs for simplicity. Or we search both.
         filter = { _id: { $in: recipientIds } };
      }

      if (audienceType === 'leads' || audienceType === 'selected') {
        const leads = await LeadModel.find(audienceType === 'leads' ? {} : filter).select('_id phone');
        leads.forEach(l => recipientsList.push({ recipientId: l._id, phone: l.phone }));
      }

      if (audienceType === 'active_clients' || audienceType === 'inactive_clients' || audienceType === 'selected') {
        let clientFilter = { ...filter };
        if (audienceType === 'active_clients') clientFilter.isActive = true;
        if (audienceType === 'inactive_clients') clientFilter.isActive = false;

        const clients = await ClientModel.find(clientFilter).select('_id personalInfo.whatsappNumber personalInfo.mobileNo whatsappNumber');
        clients.forEach(c => {
          const phone = c.personalInfo?.whatsappNumber || c.whatsappNumber || c.personalInfo?.mobileNo;
          if (phone) {
            recipientsList.push({ recipientId: c._id, phone });
          }
        });
      }
    });

    if (recipientsList.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid recipients found' });
    }

    const CampaignModel = conn.models.CustomMessageCampaign || conn.model('CustomMessageCampaign', CustomMessageCampaign.schema);
    
    let newCampaign;
    await runWithTenantContext({ tenantDb: conn, models: { CustomMessageCampaign: CampaignModel } }, async () => {
      newCampaign = new CampaignModel({
        gymId,
        templateName,
        messageContent,
        mediaUrl,
        audienceType,
        recipientCount: recipientsList.length,
        recipients: recipientsList,
        status: 'processing',
        createdBy: req.user._id
      });
      await newCampaign.save();
    });

    // Start background processing
    processMessageCampaign(newCampaign._id, gymId, dbName, recipientsList);

    return res.status(200).json({
      success: true,
      message: 'Campaign started successfully',
      data: {
        campaignId: newCampaign._id,
        recipientCount: recipientsList.length
      }
    });

  } catch (error) {
    console.error('Error creating custom message campaign:', error);
    return res.status(500).json({ success: false, message: 'Failed to create campaign' });
  }
};
