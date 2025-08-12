const { getQueue } = require('../services/queueService');
const { initScheduler } = require('../services/jobScheduler');
const maintenanceProcessor = require('../services/maintenanceProcessor');
const JobEvent = require('../models/JobEvent');

describe('Job Scheduler Service', () => {
    let maintenanceQueue;

    beforeEach(async () => {
        maintenanceQueue = getQueue('maintenance');
        await maintenanceQueue.drain();
        // Remove repeatable jobs to ensure a clean state for each test
        const repeatableJobs = await maintenanceQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            await maintenanceQueue.removeRepeatableByKey(job.key);
        }
    });

    it('should schedule the purge_old_job_events job on initialization', async () => {
        await initScheduler();

        const repeatableJobs = await maintenanceQueue.getRepeatableJobs();
        expect(repeatableJobs.length).toBe(1);
        const job = repeatableJobs[0];
        expect(job.name).toBe('purge_old_job_events');
        expect(job.pattern).toBe('0 0 * * *');
    });
});

describe('Maintenance Processor', () => {
    beforeEach(async () => {
        await JobEvent.deleteMany({});
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
});
