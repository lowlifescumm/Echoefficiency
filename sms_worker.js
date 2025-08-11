require('dotenv').config();
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const processor = require('./services/smsProcessor');

// --- Worker Implementation ---
const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null
});

const worker = new Worker('sms', processor, { connection });

console.log('SMS worker listening for jobs...');

// --- Graceful Shutdown ---
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal} in SMS worker. Closing...`);
  await worker.close();
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
