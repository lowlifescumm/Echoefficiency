const { getQueue } = require('../services/queueService');
const { initScheduler } = require('../services/jobScheduler');
const maintenanceProcessor = require('../services/maintenanceProcessor');
const { getConnection } = require('../services/queueService');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Membership = require('../models/Membership');
const JobEvent = require('../models/JobEvent');

// Mock the getQueue to control job counts
jest.mock('../services/queueService', () => {
    const originalModule = jest.requireActual('../services/queueService');
    const mockQueues = {};
    const getMockQueue = (name) => {
        if (!mockQueues[name]) {
            const mockQueue = {
                add: jest.fn(),
                getRepeatableJobs: jest.fn().mockResolvedValue([]),
                removeRepeatableByKey: jest.fn(),
                getFailedCount: jest.fn().mockResolvedValue(0),
                drain: jest.fn(),
            };
            mockQueues[name] = mockQueue;
        }
        return mockQueues[name];
    };
    return {
        ...originalModule,
        getQueue: getMockQueue,
        // Allow resetting mocks
        __mockQueues: mockQueues,
    };
});

const { __mockQueues } = require('../services/queueService');

describe('Job Scheduler Service', () => {
    let maintenanceQueue;

    beforeEach(() => {
        // Reset mocks before each test
        Object.values(__mockQueues).forEach(q => {
            q.add.mockClear();
            q.getRepeatableJobs.mockResolvedValue([]);
            q.getFailedCount.mockResolvedValue(0);
        });
        maintenanceQueue = getQueue('maintenance');
    });

    beforeEach(async () => {
        maintenanceQueue = getQueue('maintenance');
        await maintenanceQueue.drain();
        // Remove repeatable jobs to ensure a clean state for each test
        const repeatableJobs = await maintenanceQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            await maintenanceQueue.removeRepeatableByKey(job.key);
        }
    });

    it('should schedule the purge_old_job_events and check_system_health jobs on initialization', async () => {
        await initScheduler();

        expect(maintenanceQueue.add).toHaveBeenCalledTimes(2);

        expect(maintenanceQueue.add).toHaveBeenCalledWith(
            'purge_old_job_events',
            {},
            expect.objectContaining({
                repeat: { cron: '0 0 * * *' }
            })
        );

        expect(maintenanceQueue.add).toHaveBeenCalledWith(
            'check_system_health',
            {},
            expect.objectContaining({
                repeat: { every: 300000 }
            })
        );
    });
});

describe('Maintenance Processor', () => {
    let ownerUser, organization, redis;

    beforeAll(async () => {
        redis = getConnection();
        ownerUser = await User.create({
            username: 'alertowner',
            email: 'alertowner@test.com',
            password: 'password123',
        });
        organization = await Organization.create({ name: 'Alert Test Org', owner: ownerUser._id });
        await Membership.create({ user: ownerUser._id, organization: organization._id, role: 'Owner' });
    });

    afterAll(async () => {
        await User.findByIdAndDelete(ownerUser._id);
        await Organization.findByIdAndDelete(organization._id);
        await Membership.deleteMany({ organization: organization._id });
    });

    beforeEach(async () => {
        await JobEvent.deleteMany({});
        // Clear mock calls and cooldown keys before each test
        Object.values(__mockQueues).forEach(q => q.add.mockClear());
        const keys = await redis.keys('alert:cooldown:*');
        if (keys.length) {
            await redis.del(keys);
        }
    });

    it('should purge only job events older than 30 days', async () => {
        const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
        const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

        // Create one old and one new job event
        await JobEvent.create({ idempotencyKey: 'old-key', jobId: '1', queueName: 'q', status: 'completed', createdAt: thirtyFiveDaysAgo });
        await JobEvent.create({ idempotencyKey: 'new-key', jobId: '2', queueName: 'q', status: 'completed', createdAt: tenDaysAgo });

        let jobEventCount = await JobEvent.countDocuments();
        expect(jobEventCount).toBe(2);

        // Run the processor
        const mockJob = { id: 'purge-job', name: 'purge_old_job_events', data: {} };
        await maintenanceProcessor(mockJob);

        // Verify only the old one was deleted
        jobEventCount = await JobEvent.countDocuments();
        expect(jobEventCount).toBe(1);
        const remainingEvent = await JobEvent.findOne();
        expect(remainingEvent.idempotencyKey).toBe('new-key');
    });

    describe('handleCheckSystemHealth', () => {
        it('should not send an alert if failed jobs are below the threshold', async () => {
            // All mock queues have getFailedCount resolving to 0 by default
            const mockJob = { id: 'health-check-job', name: 'check_system_health', data: {} };
            await maintenanceProcessor(mockJob);

            const emailQueue = getQueue('emails');
            expect(emailQueue.add).not.toHaveBeenCalled();
        });

        it('should send an alert if failed jobs exceed the threshold', async () => {
            const webhooksQueue = getQueue('webhooks');
            webhooksQueue.getFailedCount.mockResolvedValue(15);

            const mockJob = { id: 'health-check-job', name: 'check_system_health', data: {} };
            await maintenanceProcessor(mockJob);

            const emailQueue = getQueue('emails');
            expect(emailQueue.add).toHaveBeenCalledTimes(1);
            expect(emailQueue.add).toHaveBeenCalledWith('send_system_alert', expect.objectContaining({
                recipient: 'alertowner@test.com',
                queueName: 'webhooks',
                failedCount: 15,
            }));
        });

        it('should not send an alert if one was recently sent (cooldown)', async () => {
            const webhooksQueue = getQueue('webhooks');
            webhooksQueue.getFailedCount.mockResolvedValue(15);

            const redis = getConnection();
            await redis.set('alert:cooldown:webhooks', 'true', 'EX', 60);

            const mockJob = { id: 'health-check-job', name: 'check_system_health', data: {} };
            await maintenanceProcessor(mockJob);

            const emailQueue = getQueue('emails');
            expect(emailQueue.add).not.toHaveBeenCalled();
        });

        it('should set a cooldown in Redis after sending an alert', async () => {
            const webhooksQueue = getQueue('webhooks');
            webhooksQueue.getFailedCount.mockResolvedValue(20);

            const mockJob = { id: 'health-check-job', name: 'check_system_health', data: {} };
            await maintenanceProcessor(mockJob);

            const redis = getConnection();
            const cooldown = await redis.get('alert:cooldown:webhooks');
            expect(cooldown).toBe('true');
        });
    });
});
