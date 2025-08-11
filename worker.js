require('dotenv').config();
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const mongoose = require('mongoose');
const processor = require('./services/jobProcessor');

// --- Database Connection ---
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in the environment');
}
mongoose.connect(process.env.DATABASE_URL)
  .then(() => console.log('Worker DB connected successfully'))
  .catch(err => {
    console.error('Worker DB connection error:', err);
    process.exit(1);
  });

// --- Worker Implementation ---
const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null
});

const worker = new Worker('default', processor, { connection });

console.log('Worker listening for jobs...');

// --- Graceful Shutdown ---
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Closing worker and connections...`);
  await worker.close();
  await mongoose.connection.close();
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
