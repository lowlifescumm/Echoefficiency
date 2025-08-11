const crypto = require('crypto');
const axios = require('axios');
const WebhookDelivery = require('../models/WebhookDelivery');

const processor = async (job) => {
  const { deliveryId } = job.data;
  console.log(`Processing webhook delivery: ${deliveryId}`);

  const delivery = await WebhookDelivery.findById(deliveryId).populate('endpoint');
  if (!delivery || !delivery.endpoint) {
    throw new Error(`Delivery or endpoint not found for deliveryId: ${deliveryId}`);
  }

  const { endpoint, payload, topic } = delivery;
  const timestamp = new Date().toISOString();
  const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
  const signature = crypto
    .createHmac('sha256', endpoint.secret)
    .update(signaturePayload)
    .digest('hex');

  const headers = {
    'Content-Type': 'application/json',
    'X-Echo-Event-Id': delivery._id.toString(),
    'X-Echo-Topic': topic,
    'X-Echo-Timestamp': timestamp,
    'X-Echo-Signature': signature,
  };

  const attempt = { timestamp: new Date() };
  try {
    const response = await axios.post(endpoint.url, payload, { headers });
    attempt.statusCode = response.status;
    attempt.success = response.status >= 200 && response.status < 300;

    delivery.status = attempt.success ? 'success' : 'failed';
    console.log(`Webhook sent to ${endpoint.url}. Status: ${response.status}`);

  } catch (error) {
    attempt.statusCode = error.response ? error.response.status : 500;
    attempt.error = error.message;
    attempt.success = false;
    delivery.status = 'failed';
    console.error(`Failed to send webhook to ${endpoint.url}:`, error.message);
    throw error;
  } finally {
    delivery.attempts.push(attempt);
    await delivery.save();
  }
};

module.exports = processor;
