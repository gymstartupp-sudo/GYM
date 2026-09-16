const mongoose = require('mongoose');
const { createTenantModelProxy } = require('../utils/tenantContext');

const savedMessageTemplateSchema = new mongoose.Schema({
  gymId: { type: String, required: true },
  title: { type: String, required: true },
  templateType: { type: String, enum: ['msg', 'msg_img', 'msg_video'], default: 'msg' },
  mediaUrl: { type: String, default: null },
  content: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true }
}, { timestamps: true });

const SavedMessageTemplate = createTenantModelProxy('SavedMessageTemplate', savedMessageTemplateSchema);
SavedMessageTemplate.schema = savedMessageTemplateSchema;
module.exports = SavedMessageTemplate;
