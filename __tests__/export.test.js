const request = require('supertest');
const app =require('../app');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Membership = require('../models/Membership');
const FeedbackForm = require('../models/FeedbackForm');
const FeedbackSubmission = require('../models/FeedbackSubmission');
const Export = require('../models/Export');
const processor = require('../services/jobProcessor');
const { getQueue } = require('../services/queueService');

describe('Asynchronous Export Feature', () => {
    let agent;
    let user;
    let testOrg;
    let testForm;

    beforeEach(async () => {
        // Clean up
        await User.deleteMany({});
        await Organization.deleteMany({});
        await Membership.deleteMany({});
        await FeedbackForm.deleteMany({});
        await FeedbackSubmission.deleteMany({});
        await Export.deleteMany({});
        const queue = getQueue('default');
        await queue.drain();

        // Setup user and org
        await request(app).post('/auth/register').send({ username: 'exporter', email: 'exporter@test.com', password: 'password' });
        user = await User.findOne({ email: 'exporter@test.com' });
        testOrg = await Organization.findOne({ owner: user._id });

        // Setup form and submissions
        testForm = await FeedbackForm.create({
            ownerId: user._id,
            organization: testOrg._id,
            title: 'Export Test Form',
            questions: [{ questionText: 'Color', questionType: 'text' }],
        });
        await FeedbackSubmission.create({
            formId: testForm._id,
            responses: { 'Color': 'Blue' }
        });

        // Login agent
        agent = request.agent(app);
        await agent.post('/auth/login').send({ username: 'exporter', password: 'password' });
    });

    it('should enqueue an export job when the endpoint is called', async () => {
        const res = await agent
            .post(`/form/${testForm._id}/export`)
            .send({}); // CSRF token handled by agent

        expect(res.statusCode).toBe(302);
        expect(res.headers.location).toBe('/dashboard');

        // Check that an Export record was created
        const exportRecord = await Export.findOne({ form: testForm._id });
        expect(exportRecord).not.toBeNull();
        expect(exportRecord.status).toBe('pending');

        // Check that a job was added to the queue
        const queue = getQueue('default');
        const job = await queue.getJob(exportRecord._id.toString());
        // Note: We can't easily get the job by exportId, so we check job counts
        const jobCount = await queue.getJobCountByTypes('waiting');
        expect(jobCount).toBe(1);
    });

    it('should process the export job, and allow the user to download the file', async () => {
        // Enqueue the job
        const res = await agent
            .post(`/form/${testForm._id}/export`)
            .send({});

        const exportRecord = await Export.findOne({ form: testForm._id });
        const queue = getQueue('default');
        const jobs = await queue.getJobs(['waiting']);
        const job = jobs[0];

        // Manually run the processor with the job from the queue
        await processor(job);

        // Check that the Export record is now 'completed'
        const completedExport = await Export.findById(exportRecord._id);
        expect(completedExport.status).toBe('completed');
        expect(completedExport.filePath).toBeDefined();

        // Try to download the file
        const downloadRes = await agent.get(`/organization/exports/download/${completedExport._id}`);

        expect(downloadRes.statusCode).toBe(200);
        expect(downloadRes.headers['content-type']).toContain('text/csv');
        expect(downloadRes.text).toContain('Submitted At,Color');
        expect(downloadRes.text).toContain('Blue');
    });
});
