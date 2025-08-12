const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Membership = require('../models/Membership');

describe('Monitoring Routes', () => {
    let adminAgent, viewerAgent;
    let adminUser, viewerUser, testOrg;

    beforeEach(async () => {
        // Create users
        adminUser = await User.create({
            username: 'monitoradmin',
            email: 'monitoradmin@test.com',
            password: 'password123'
        });
        viewerUser = await User.create({
            username: 'monitorviewer',
            email: 'monitorviewer@test.com',
            password: 'password123',
        });

        // Create organization and memberships
        testOrg = await Organization.create({ name: 'Monitor Test Org', owner: adminUser._id });
        await Membership.create({ user: adminUser._id, organization: testOrg._id, role: 'Admin' });
        await Membership.create({ user: viewerUser._id, organization: testOrg._id, role: 'Viewer' });

        adminUser.currentOrganization = testOrg._id;
        viewerUser.currentOrganization = testOrg._id;
        await adminUser.save();
        await viewerUser.save();

        // Create and authenticate agents
        adminAgent = request.agent(app);
        // ** THE FIX IS HERE ** Use username for login, not email
        await adminAgent.post('/auth/login').send({ username: 'monitoradmin', password: 'password123' });

        viewerAgent = request.agent(app);
        await viewerAgent.post('/auth/login').send({ username: 'monitorviewer', password: 'password123' });
    });

    afterEach(async () => {
        await User.deleteMany({});
        await Organization.deleteMany({});
        await Membership.deleteMany({});
    });

    describe('GET /monitoring', () => {
        it('should be accessible by an Admin', async () => {
            const res = await adminAgent.get('/monitoring');
            expect(res.statusCode).toEqual(200);
            expect(res.text).toContain('System Monitoring Dashboard');
        });

        it('should be inaccessible by a Viewer', async () => {
            const res = await viewerAgent.get('/monitoring');
            expect(res.statusCode).toEqual(403);
        });
    });

    describe('GET /monitoring/api/queue-stats', () => {
        it('should return queue statistics for an Admin', async () => {
            const res = await adminAgent.get('/monitoring/api/queue-stats');
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('default');
            expect(res.body).toHaveProperty('emails');
            expect(res.body.default).toHaveProperty('waiting');
        });

        it('should be inaccessible by a Viewer', async () => {
            const res = await viewerAgent.get('/monitoring/api/queue-stats');
            expect(res.statusCode).toEqual(403);
        });
    });
});
