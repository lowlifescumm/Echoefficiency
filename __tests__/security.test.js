const request = require('supertest');
const app = require('../app');

describe('Standard Security Headers', () => {
    let response;

    beforeAll(async () => {
        response = await request(app).get('/');
    });

    it('should set the X-Content-Type-Options header to nosniff', () => {
        expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set the Referrer-Policy header', () => {
        expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should set a Content-Security-Policy header', () => {
        expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('should include correct directives in the CSP', () => {
        const csp = response.headers['content-security-policy'];
        expect(csp).toContain("default-src 'self'");
        expect(csp).toContain("script-src 'self' 'unsafe-inline' blob: https://www.googletagmanager.com https://cdn.jsdelivr.net/npm/chart.js");
        expect(csp).toContain("frame-ancestors 'none'");
    });

    it('should not set the Strict-Transport-Security header in a non-production environment', () => {
        expect(response.headers['strict-transport-security']).toBeUndefined();
    });
});
