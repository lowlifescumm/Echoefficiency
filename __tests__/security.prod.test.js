// Set this at the very top, before any other imports
process.env.NODE_ENV = 'production';
process.env.SESSION_SECRET = 'prod-secret-for-test';

const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../models/User');

describe('Production Security', () => {
    let app;
    let loginResponse;

    beforeAll(async () => {
        process.env.DATABASE_URL = global.mongoUri;

        await jest.isolateModulesAsync(async () => {
            app = require('../app');
        });

        await User.create({ username: 'prod-sec-user', password: 'password123', email: 'prod-sec@test.com' });
        const agent = request.agent(app);
        loginResponse = await agent.post('/auth/login').send({ username: 'prod-sec-user', password: 'password123' });
    });

    afterAll(async () => {
        await User.deleteMany({});
    });

    it('should set the Strict-Transport-Security header correctly', () => {
        // We can check this on the login response, it should be on all responses
        expect(loginResponse.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
    });

    it('should set other security headers correctly', () => {
        expect(loginResponse.headers['x-content-type-options']).toBe('nosniff');
        expect(loginResponse.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
        expect(loginResponse.headers['content-security-policy']).toBeDefined();
    });

    it('should set secure, httpOnly, and sameSite attributes on the session cookie', () => {
        const cookieHeader = loginResponse.headers['set-cookie'][0];
        expect(cookieHeader).toContain('Secure');
        expect(cookieHeader).toContain('HttpOnly');
        expect(cookieHeader).toContain('SameSite=Lax');
    });
});
