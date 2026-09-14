const mongoose = require('mongoose');
const { createTenantModelProxy } = require('../utils/tenantContext');

const customMessageCampaignSchema = new mongoose.Schema({
  gymId: { type: String, required: true },
  templateName: { type: String, required: true, enum: ['msg', 'msg_imag', 'msg_video'] },
  messageContent: { type: String, required: true },
  mediaUrl: { type: String, default: null },
  audienceType: { 
    type: String, 
    required: true, 
    enum: ['leads', 'active_clients', 'inactive_clients', 'selected'] 
  },
  recipientCount: { type: Number, default: 0 },
  recipients: [{
    recipientId: { type: mongoose.Schema.Types.ObjectId, required: true },
    phone: { type: String, required: true },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    providerMessageId: { type: String, default: null },
    error: { type: String, default: null },
    sentAt: { type: Date, default: null }
  }],
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true }
}, { timestamps: true });

const CustomMessageCampaign = createTenantModelProxy('CustomMessageCampaign', customMessageCampaignSchema);
CustomMessageCampaign.schema = customMessageCampaignSchema;
module.exports = CustomMessageCampaign;
