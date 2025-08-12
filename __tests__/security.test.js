const request = require('supertest');
const app = require('../app');

describe('Security Headers', () => {
    it('should set the X-Content-Type-Options header to nosniff', async () => {
        const response = await request(app).get('/');
        expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set a Content-Security-Policy header', async () => {
        const response = await request(app).get('/');
        expect(response.headers['content-security-policy']).toBeDefined();
    });
});
