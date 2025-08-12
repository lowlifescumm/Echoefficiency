require('dotenv').config();
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const mongoose = require('mongoose');
const processor = require('./services/maintenanceProcessor');

// --- Database Connection ---
mongoose.connect(process.env.DATABASE_URL)
  .then(() => console.log('Maintenance worker DB connected'))
  .catch(err => {
    console.error('Maintenance worker DB connection error:', err);
    process.exit(1);
  });

// --- Worker Implementation ---
const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null
});

// A new queue for maintenance tasks
const worker = new Worker('maintenance', processor, { connection });

console.log('Maintenance worker listening for jobs...');

// --- Graceful Shutdown ---
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal} in maintenance worker. Closing...`);
  await worker.close();
  await mongoose.connection.close();
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
