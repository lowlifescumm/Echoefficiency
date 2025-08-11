const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Membership = require('../models/Membership');
const { getQueue } = require('../services/queueService');
const emailProcessor = require('../services/emailProcessor');
const sendEmail = require('../utils/sendEmail');

jest.mock('../utils/sendEmail'); // Mock the email utility

describe('Email Sending Service', () => {

    beforeEach(async () => {
        // Clean up
        await User.deleteMany({});
        await Organization.deleteMany({});
        await Membership.deleteMany({});
        const emailsQueue = getQueue('emails');
        await emailsQueue.drain();
        sendEmail.mockClear();
    });

    it('should enqueue a welcome email job on user registration', async () => {
        const emailsQueue = getQueue('emails');

        await request(app)
            .post('/auth/register')
            .send({ username: 'emailtestuser', email: 'emailtest@example.com', password: 'password123' });

        const jobs = await emailsQueue.getJobs(['waiting', 'active']);
        expect(jobs.length).toBe(1);
        const job = jobs[0];
        expect(job.name).toBe('send_welcome_email');
        expect(job.data.email).toBe('emailtest@example.com');
    });

    it('should process a send_welcome_email job and call the email utility', async () => {
        const jobData = {
            email: 'recipient@example.com',
            username: 'Test Recipient',
        };
        const mockJob = {
            id: 'mock-email-job-1',
            name: 'send_welcome_email',
            data: jobData,
        };

        await emailProcessor(mockJob);

        expect(sendEmail).toHaveBeenCalledTimes(1);
        const emailArgs = sendEmail.mock.calls[0][0];
        expect(emailArgs.to).toBe(jobData.email);
        expect(emailArgs.subject).toContain('Welcome');
        expect(emailArgs.html).toContain(jobData.username);
    });
});
