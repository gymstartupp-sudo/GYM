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
      let clientName = 'Member';

      await runWithTenantContext({ tenantDb: conn, models: { CustomMessageCampaign: CampaignModel, Client: conn.models.Client || conn.model('Client', Client.schema), Lead: conn.models.Lead || conn.model('Lead', Lead.schema) } }, async () => {
        campaignRecord = await CampaignModel.findById(campaignId);
        
        let user = await conn.models.Client.findById(recipient.recipientId).select('personalInfo.name name');
        if (user) {
          clientName = user.personalInfo?.name || user.name || 'Member';
        } else {
          user = await conn.models.Lead.findById(recipient.recipientId).select('name');
          if (user) clientName = user.name || 'Member';
        }
      });
      
      if (!campaignRecord) break;
      
      const mediaType = campaignRecord.templateName === 'msg_video' ? 'video' : (campaignRecord.templateName === 'msg_img' ? 'image' : null);

      const result = await sendCustomTemplateMessage({
        phone: formattedWhatsApp,
        clientName: clientName,
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

    let mediaUrl = req.body.mediaUrl || null;
    if (req.file) {
      const isVideo = req.file.mimetype.startsWith('video');
      mediaUrl = await uploadCustomMessageMediaToCloudinary(req.file.path, isVideo ? 'video' : 'image');
    }

    if ((templateName === 'msg_img' || templateName === 'msg_video') && !mediaUrl) {
      return res.status(400).json({ success: false, message: 'Media file or URL is required for this template' });
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

exports.saveTemplate = async (req, res) => {
  try {
    const { gymId, dbName } = req.user;
    const { title, templateType, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const conn = await getTenantConnection(dbName);
    const SavedMessageTemplate = require('../models/SavedMessageTemplate');
    const TemplateModel = conn.models.SavedMessageTemplate || conn.model('SavedMessageTemplate', SavedMessageTemplate.schema);

    let newTemplate;
    await runWithTenantContext({ tenantDb: conn, models: { SavedMessageTemplate: TemplateModel } }, async () => {
      newTemplate = new TemplateModel({
        gymId,
        title,
        templateType: templateType || 'msg',
        mediaUrl: req.file ? 'uploading...' : null,
        content,
        createdBy: req.user._id
      });
      await newTemplate.save();
    });

    if (req.file) {
      // Run Cloudinary upload in the background
      (async () => {
        try {
          const isVideo = req.file.mimetype.startsWith('video');
          const uploadedUrl = await uploadCustomMessageMediaToCloudinary(req.file.path, isVideo ? 'video' : 'image');
          await runWithTenantContext({ tenantDb: conn, models: { SavedMessageTemplate: TemplateModel } }, async () => {
            await TemplateModel.findByIdAndUpdate(newTemplate._id, { mediaUrl: uploadedUrl });
          });
        } catch (error) {
          console.error('Background upload failed for template:', error);
          await runWithTenantContext({ tenantDb: conn, models: { SavedMessageTemplate: TemplateModel } }, async () => {
            await TemplateModel.findByIdAndUpdate(newTemplate._id, { mediaUrl: null });
          });
        }
      })();
    }

    return res.status(201).json({ success: true, message: 'Template saved successfully', data: newTemplate });
  } catch (error) {
    console.error('Error saving template:', error);
    return res.status(500).json({ success: false, message: 'Failed to save template' });
  }
};

exports.getCampaignHistory = async (req, res) => {
  try {
    const { gymId, dbName } = req.user;
    const conn = await getTenantConnection(dbName);
    const CustomMessageCampaign = require('../models/CustomMessageCampaign');
    const CampaignModel = conn.models.CustomMessageCampaign || conn.model('CustomMessageCampaign', CustomMessageCampaign.schema);

    const campaigns = await CampaignModel.find({ gymId }).sort({ createdAt: -1 }).lean();
    
    const history = {};
    for (const campaign of campaigns) {
      if (!campaign.recipients) continue;
      for (const rec of campaign.recipients) {
        if (!rec.recipientId) continue;
        const id = String(rec.recipientId);
        if (!history[id]) {
          history[id] = {
            templateName: campaign.templateName,
            status: rec.status,
            date: rec.sentAt || campaign.createdAt,
            error: rec.error
          };
        }
      }
    }

    return res.status(200).json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching campaign history:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch campaign history' });
  }
};

exports.getTemplates = async (req, res) => {
  try {
    const { gymId, dbName } = req.user;
    const conn = await getTenantConnection(dbName);
    const SavedMessageTemplate = require('../models/SavedMessageTemplate');
    const TemplateModel = conn.models.SavedMessageTemplate || conn.model('SavedMessageTemplate', SavedMessageTemplate.schema);

    let templates = [];
    await runWithTenantContext({ tenantDb: conn, models: { SavedMessageTemplate: TemplateModel } }, async () => {
      templates = await TemplateModel.find({ gymId }).sort({ createdAt: -1 });
    });

    return res.status(200).json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch templates' });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const { gymId, dbName } = req.user;
    const { id } = req.params;

    const conn = await getTenantConnection(dbName);
    const SavedMessageTemplate = require('../models/SavedMessageTemplate');
    const TemplateModel = conn.models.SavedMessageTemplate || conn.model('SavedMessageTemplate', SavedMessageTemplate.schema);

    await runWithTenantContext({ tenantDb: conn, models: { SavedMessageTemplate: TemplateModel } }, async () => {
      await TemplateModel.findOneAndDelete({ _id: id, gymId });
    });

    return res.status(200).json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete template' });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const { gymId, dbName } = req.user;
    const { id } = req.params;
    const { title, templateType, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const conn = await getTenantConnection(dbName);
    const SavedMessageTemplate = require('../models/SavedMessageTemplate');
    const TemplateModel = conn.models.SavedMessageTemplate || conn.model('SavedMessageTemplate', SavedMessageTemplate.schema);

    let updatedTemplate;
    await runWithTenantContext({ tenantDb: conn, models: { SavedMessageTemplate: TemplateModel } }, async () => {
      let updateFields = { title, templateType, content };
      if (req.file) updateFields.mediaUrl = 'uploading...';

      updatedTemplate = await TemplateModel.findOneAndUpdate(
        { _id: id, gymId },
        updateFields,
        { new: true }
      );
    });

    if (req.file && updatedTemplate) {
      // Run Cloudinary upload in the background
      (async () => {
        try {
          const isVideo = req.file.mimetype.startsWith('video');
          const uploadedUrl = await uploadCustomMessageMediaToCloudinary(req.file.path, isVideo ? 'video' : 'image');
          await runWithTenantContext({ tenantDb: conn, models: { SavedMessageTemplate: TemplateModel } }, async () => {
            await TemplateModel.findByIdAndUpdate(updatedTemplate._id, { mediaUrl: uploadedUrl });
          });
        } catch (error) {
          console.error('Background upload failed for template:', error);
          await runWithTenantContext({ tenantDb: conn, models: { SavedMessageTemplate: TemplateModel } }, async () => {
            await TemplateModel.findByIdAndUpdate(updatedTemplate._id, { mediaUrl: null });
          });
        }
      })();
    }

    if (!updatedTemplate) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    return res.status(200).json({ success: true, message: 'Template updated successfully', data: updatedTemplate });
  } catch (error) {
    console.error('Error updating template:', error);
    return res.status(500).json({ success: false, message: 'Failed to update template' });
  }
};
