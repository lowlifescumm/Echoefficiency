require('dotenv').config();
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const mongoose = require('mongoose');
const processor = require('./services/emailProcessor');

// --- Database Connection ---
// Although the email processor itself might not use the DB directly,
// it's good practice to connect in case future email jobs need it.
mongoose.connect(process.env.DATABASE_URL)
  .then(() => console.log('Email worker DB connected'))
  .catch(err => {
    console.error('Email worker DB connection error:', err);
    process.exit(1);
  });

// --- Worker Implementation ---
const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null
});

const worker = new Worker('emails', processor, { connection });

console.log('Email worker listening for jobs...');

// --- Graceful Shutdown ---
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal} in email worker. Closing...`);
  await worker.close();
  await mongoose.connection.close();
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
