const JobEvent = require('../models/JobEvent');

const processor = async (job) => {
  console.log(`Processing job #${job.id} with data:`, job.data);
  const { idempotencyKey, ...payload } = job.data;

  if (!idempotencyKey) {
    console.error(`Job #${job.id} is missing an idempotency key. Skipping.`);
    return;
  }

  // 1. Idempotency Check
  let jobEvent;
  try {
    jobEvent = await JobEvent.create({
      idempotencyKey,
      jobId: job.id,
      queueName: job.queueName,
      status: 'processing',
      payload,
    });
    console.log(`Job event created for key: ${idempotencyKey}`);
  } catch (error) {
    if (error.code === 11000) { // Duplicate key error
      console.log(`Job with idempotency key ${idempotencyKey} already processed. Skipping.`);
      return; // Stop processing
    }
    throw error; // Re-throw other errors
  }

  // 2. Actual Job Logic
  try {
    console.log('--- Executing actual job logic ---');
    // In a real scenario, you would do things like send emails,
    // generate reports, etc. based on the job payload.
    // For now, we just simulate work with a timeout.
    await new Promise(resolve => setTimeout(resolve, 100)); // Shorter delay for tests
    console.log('--- Job logic complete ---');

    // 3. Mark as completed
    await JobEvent.findByIdAndUpdate(jobEvent._id, { status: 'completed' });
    console.log(`Job #${job.id} completed successfully.`);

  } catch (error) {
    // 4. Mark as failed
    console.error(`Job #${job.id} failed:`, error);
    await JobEvent.findByIdAndUpdate(jobEvent._id, { status: 'failed' });
    throw error; // Re-throw to let BullMQ handle retry logic
  }
};

module.exports = processor;
