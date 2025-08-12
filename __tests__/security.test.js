const request = require('supertest');

describe('Security Headers', () => {

    describe('in production environment', () => {
        let app;
        let response;
        const originalEnv = process.env;

        beforeAll(async () => {
            // Set up a mock production environment
            process.env = {
                ...originalEnv,
                NODE_ENV: 'production',
                SESSION_SECRET: 'prod-secret-for-test',
                DATABASE_URL: 'mongodb://localhost/test-prod-db'
            };

            // Use jest.isolateModules to get a fresh instance of the app with the new env
            await jest.isolateModulesAsync(async () => {
                app = require('../app');
                response = await request(app).get('/');
            });
        });

        afterAll(() => {
            // Restore original environment
            process.env = originalEnv;
        });

        it('should set the Strict-Transport-Security header correctly', () => {
            expect(response.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
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
    });

    describe('in test environment', () => {
        it('should not set the Strict-Transport-Security header', async () => {
            const app = require('../app');
            const response = await request(app).get('/');
            expect(response.headers['strict-transport-security']).toBeUndefined();
        });
    });
});
