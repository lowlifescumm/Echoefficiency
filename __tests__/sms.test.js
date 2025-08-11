const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Membership = require('../models/Membership');
const FeedbackForm = require('../models/FeedbackForm');
const { getQueue } = require('../services/queueService');
const smsProcessor = require('../services/smsProcessor');
const twilio = require('twilio');

jest.mock('twilio'); // Mock the twilio library

describe('SMS Sending Service', () => {
    let user;
    let testOrg;
    let testForm;
    const userPhoneNumber = '+15551234567';

    beforeEach(async () => {
        // Clean up
        await User.deleteMany({});
        await Organization.deleteMany({});
        await Membership.deleteMany({});
        await FeedbackForm.deleteMany({});
        const smsQueue = getQueue('sms');
        await smsQueue.drain();

        // Mock the twilio client's create method
        const mockCreate = jest.fn();
        twilio.mockReturnValue({
            messages: {
                create: mockCreate
            }
        });

        // Setup user with a phone number
        await request(app).post('/auth/register').send({ username: 'smsuser', email: 'sms@test.com', password: 'password' });
        user = await User.findOne({ email: 'sms@test.com' });
        user.phoneNumber = userPhoneNumber;
        await user.save();

        testOrg = await Organization.findOne({ owner: user._id });
        testForm = await FeedbackForm.create({
            ownerId: user._id,
            organization: testOrg._id,
            title: 'SMS Test Form',
            questions: [{ questionText: 'Q1', questionType: 'text' }],
        });
    });

    it('should enqueue an SMS notification job on new form submission', async () => {
        const smsQueue = getQueue('sms');

        await request(app)
            .post('/submit-feedback')
            .send({ formId: testForm._id, responses: { 'Q1': 'Test' } });

        const jobs = await smsQueue.getJobs(['waiting', 'active']);
        expect(jobs.length).toBe(1);
        const job = jobs[0];
        expect(job.name).toBe('send_sms_notification');
        expect(job.data.to).toBe(userPhoneNumber);
    });

    it('should process a send_sms_notification job and call the Twilio client', async () => {
        const jobData = {
            to: userPhoneNumber,
            body: 'Test SMS body',
        };
        const mockJob = {
            id: 'mock-sms-job-1',
            name: 'send_sms_notification',
            data: jobData,
        };

        await smsProcessor(mockJob);

        const twilioClient = twilio();
        expect(twilioClient.messages.create).toHaveBeenCalledTimes(1);
        const smsArgs = twilioClient.messages.create.mock.calls[0][0];
        expect(smsArgs.to).toBe(jobData.to);
        expect(smsArgs.body).toBe(jobData.body);
    });
});
