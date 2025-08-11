const JobEvent = require('../models/JobEvent');
const { v4: uuidv4 } = require('uuid');
const { getQueue } = require('../services/queueService');
const processor = require('../services/jobProcessor');

// Mock BullMQ's job object structure for direct processor calls
const createMockJob = (data, name = 'testJob') => ({
  id: 'test-job-id-' + uuidv4(),
  queueName: 'default',
  name,
  data,
});

describe('Queue and Worker System (In-Process)', () => {
  beforeEach(async () => {
    // Clean up job events and the queue before each test
    await JobEvent.deleteMany({});
    const queue = getQueue('default');
    await queue.drain();
  });

  it('should process a generic job and mark it as completed', async () => {
    const idempotencyKey = uuidv4();
    const payload = { message: 'Hello World' };
    const mockJob = createMockJob({ idempotencyKey, ...payload }, 'default_test');

    await processor(mockJob);

    const jobEvent = await JobEvent.findOne({ idempotencyKey });
    expect(jobEvent).not.toBeNull();
    expect(jobEvent.status).toBe('completed');
  });

  it('should prevent duplicate job processing using idempotency key', async () => {
    const idempotencyKey = uuidv4();
    const payload = { message: 'Unique Job' };
    const mockJob1 = createMockJob({ idempotencyKey, ...payload }, 'default_test');
    const mockJob2 = createMockJob({ idempotencyKey, ...payload }, 'default_test');

    await processor(mockJob1);
    const firstRunCount = await JobEvent.countDocuments({ idempotencyKey });
    expect(firstRunCount).toBe(1);

    await processor(mockJob2);
    const secondRunCount = await JobEvent.countDocuments({ idempotencyKey });
    expect(secondRunCount).toBe(1);
  });
});
