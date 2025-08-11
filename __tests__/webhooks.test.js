const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Membership = require('../models/Membership');
const FeedbackForm = require('../models/FeedbackForm');
const WebhookEndpoint = require('../models/WebhookEndpoint');
const WebhookDelivery = require('../models/WebhookDelivery');
const processor = require('../services/webhookProcessor');
const { getQueue } = require('../services/queueService');
const axios = require('axios');
const crypto = require('crypto');

jest.mock('axios');

describe('Webhook System', () => {
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
        await WebhookEndpoint.deleteMany({});
        await WebhookDelivery.deleteMany({});
        const webhookQueue = getQueue('webhooks');
        await webhookQueue.drain();

        // Setup user, org, and form
        await request(app).post('/auth/register').send({ username: 'webhookuser', email: 'webhook@test.com', password: 'password' });
        user = await User.findOne({ email: 'webhook@test.com' });
        testOrg = await Organization.findOne({ owner: user._id });
        testForm = await FeedbackForm.create({
            ownerId: user._id,
            organization: testOrg._id,
            title: 'Webhook Test Form',
            questions: [{ questionText: 'Q1', questionType: 'text' }],
        });

        // Login agent
        agent = request.agent(app);
        await agent.post('/auth/login').send({ username: 'webhookuser', password: 'password' });
    });

    afterEach(() => {
        axios.mockClear();
    });

    describe('Webhook Endpoint Management', () => {
        it('should create a new webhook endpoint', async () => {
            const res = await agent.post('/webhooks').send({
                url: 'https://example.com/my-webhook',
                subscribed_topics: ['response.created'],
            });
            expect(res.statusCode).toBe(302);
            const endpoint = await WebhookEndpoint.findOne({ url: 'https://example.com/my-webhook' });
            expect(endpoint).not.toBeNull();
            expect(endpoint.subscribed_topics).toContain('response.created');
        });

        it('should list created webhook endpoints', async () => {
            await WebhookEndpoint.create({
                organization: testOrg._id,
                url: 'https://listed-endpoint.com',
                subscribed_topics: ['response.created'],
            });
            const res = await agent.get('/webhooks');
            expect(res.statusCode).toBe(200);
            expect(res.text).toContain('https://listed-endpoint.com');
        });
    });

    describe('Webhook Event Triggering and Processing', () => {
        it('should enqueue a job and be processed by the worker', async () => {
            // 1. Create an endpoint to receive the webhook
            const endpoint = await WebhookEndpoint.create({
                organization: testOrg._id,
                url: 'https://test-receiver.com/hook',
                subscribed_topics: ['response.created'],
            });

            // 2. Trigger the event
            await request(app).post('/submit-feedback').send({
                formId: testForm._id,
                responses: { 'Question 1': 'Answer 1' },
            });

            // 3. Verify the job was enqueued
            const webhookQueue = getQueue('webhooks');
            const jobs = await webhookQueue.getJobs(['waiting']);
            expect(jobs.length).toBe(1);
            const job = jobs[0];

            // 4. Manually run the webhook processor
            axios.post.mockResolvedValue({ status: 200, data: 'OK' });

            await processor(job);

            // 5. Verify axios was called with the correct signature
            expect(axios.post).toHaveBeenCalledTimes(1);
            const [url, payload, config] = axios.post.mock.calls[0];
            expect(url).toBe(endpoint.url);
            expect(config.headers['X-Echo-Topic']).toBe('response.created');

            // Verify HMAC signature
            const timestamp = config.headers['X-Echo-Timestamp'];
            const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
            const expectedSignature = crypto.createHmac('sha256', endpoint.secret).update(signaturePayload).digest('hex');
            expect(config.headers['X-Echo-Signature']).toBe(expectedSignature);

            // 6. Verify the delivery record was updated
            const delivery = await WebhookDelivery.findById(job.data.deliveryId);
            expect(delivery.status).toBe('success');
            expect(delivery.attempts.length).toBe(1);
            expect(delivery.attempts[0].success).toBe(true);
        });
    });
});
