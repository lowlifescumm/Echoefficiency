require('dotenv').config();
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const mongoose = require('mongoose');
const processor = require('./services/webhookProcessor');

// --- Database Connection ---
mongoose.connect(process.env.DATABASE_URL)
  .then(() => console.log('Webhook worker DB connected'))
  .catch(err => {
    console.error('Webhook worker DB connection error:', err);
    process.exit(1);
  });

// --- Worker Implementation ---
const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null
});

const worker = new Worker('webhooks', processor, { connection });

console.log('Webhook worker listening for jobs...');

// --- Graceful Shutdown ---
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal} in webhook worker. Closing...`);
  await worker.close();
  await mongoose.connection.close();
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
