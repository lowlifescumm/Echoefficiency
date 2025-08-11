const mongoose = require('mongoose');
const crypto = require('crypto');

const webhookEndpointSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  secret: {
    type: String,
    required: true,
    default: () => `whsec_${crypto.randomBytes(24).toString('hex')}`,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  subscribed_topics: {
    type: [String],
    required: true,
    // Example topics: 'response.created', 'response.updated'
  },
}, { timestamps: true });

const WebhookEndpoint = mongoose.model('WebhookEndpoint', webhookEndpointSchema);

module.exports = WebhookEndpoint;
