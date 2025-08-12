const request = require('supertest')
const app = require('../app')

describe('GET /', () => {
  it('should respond with a 200 status code', async () => {
    const response = await request(app).get('/')
    expect(response.statusCode).toBe(200)
  })

  it('should serve compressed responses', async () => {
    const response = await request(app).get('/')
        .set('Accept-Encoding', 'gzip');
    expect(response.headers['content-encoding']).toBe('gzip');
  });
})

describe('GET /healthz', () => {
  it('should respond with a 200 status code and status ok', async () => {
    const response = await request(app).get('/healthz');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
