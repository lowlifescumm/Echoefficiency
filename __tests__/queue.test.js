const request = require('supertest');
const app = require('../app');
const JobEvent = require('../models/JobEvent');
const { v4: uuidv4 } = require('uuid');
const { getQueue } = require('../services/queueService');

// Helper function to wait
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('Queue and Worker System', () => {
  beforeEach(async () => {
    // Clean up job events and the queue before each test
    await JobEvent.deleteMany({});
    const queue = getQueue('default');
    await queue.drain();
  });

  // Increase timeout for this test suite as it involves async logic
  jest.setTimeout(10000);

  it('should enqueue a job via the test endpoint', async () => {
    const idempotencyKey = uuidv4();
    const payload = { message: 'Hello World' };

    const res = await request(app)
      .post('/api/test/enqueue-job')
      .send({ idempotencyKey, ...payload });

    expect(res.statusCode).toBe(202);

    const queue = getQueue('default');
    const jobCount = await queue.getJobCountByTypes('waiting', 'active');
    expect(jobCount).toBe(1);
  });

  it('should process a job correctly using the in-process processor', async () => {
    const processor = require('../services/jobProcessor');
    const idempotencyKey = uuidv4();
    const payload = { message: 'Unique Job' };

    const createMockJob = (data) => ({
      id: 'test-job-id-' + uuidv4(),
      queueName: 'default',
      data,
    });

    const mockJob = createMockJob({ idempotencyKey, ...payload });

    // Process the job
    await processor(mockJob);

    // Verify the job event was created and completed
    const jobEvent = await JobEvent.findOne({ idempotencyKey });
    expect(jobEvent).not.toBeNull();
    expect(jobEvent.status).toBe('completed');
  });

  it('should prevent duplicate job processing using the in-process processor', async () => {
    const processor = require('../services/jobProcessor');
    const idempotencyKey = uuidv4();
    const payload = { message: 'Unique Job' };

    const createMockJob = (data) => ({
      id: 'test-job-id-' + uuidv4(),
      queueName: 'default',
      data,
    });

    const mockJob1 = createMockJob({ idempotencyKey, ...payload });
    const mockJob2 = createMockJob({ idempotencyKey, ...payload });

    // Process the job for the first time
    await processor(mockJob1);
    const firstRunCount = await JobEvent.countDocuments({ idempotencyKey });
    expect(firstRunCount).toBe(1);

    // Process the exact same job again
    await processor(mockJob2);
    const secondRunCount = await JobEvent.countDocuments({ idempotencyKey });
    expect(secondRunCount).toBe(1); // Should not have created a new one
  });
});
