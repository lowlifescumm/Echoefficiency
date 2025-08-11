const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  statusCode: { type: Number },
  error: { type: String },
  success: { type: Boolean, required: true },
}, { _id: false });

const webhookDeliverySchema = new mongoose.Schema({
  endpoint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebhookEndpoint',
    required: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  topic: {
    type: String,
    required: true,
  },
  payload: {
    type: Object,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending',
  },
  attempts: [attemptSchema],
}, { timestamps: true });

const WebhookDelivery = mongoose.model('WebhookDelivery', webhookDeliverySchema);

module.exports = WebhookDelivery;
