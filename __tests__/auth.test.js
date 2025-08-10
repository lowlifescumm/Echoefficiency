const request = require('supertest')
const app = require('../app')
const User = require('../models/User')

describe('Auth Routes', () => {
  // Clear the database before each test
  beforeEach(async () => {
    await User.deleteMany({})
  })

  // Test user registration
  describe('POST /auth/register', () => {
    it('should register a new user and redirect to /auth/login', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ username: 'testuser', email: 'testuser@example.com', password: 'password123' })

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toBe('/auth/login')

      // Verify user was created in the database
      const user = await User.findOne({ username: 'testuser' })
      expect(user).not.toBeNull()
    })

    it('should not register a user with an existing username', async () => {
      // Create a user first
      await User.create({ username: 'testuser', email: 'testuser@example.com', password: 'password123' })

      const res = await request(app)
        .post('/auth/register')
        .send({ username: 'testuser', email: 'another@example.com', password: 'password123' })

      // Should return a 409 conflict error for duplicate key
      expect(res.statusCode).toBe(409)
    })
  })

  // Test user login
  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a user to log in with
      await User.create({ username: 'testuser', email: 'testuser@example.com', password: 'password123' })
    })

    it('should log in a user and redirect to /', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ username: 'testuser', password: 'password123' })

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toBe('/')
      // Check for the session cookie
      expect(res.headers['set-cookie']).toBeDefined()
    })

    it('should not log in with an incorrect password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ username: 'testuser', password: 'wrongpassword' })

      expect(res.statusCode).toBe(400)
    })
  })

  // Test user logout
  describe('GET /auth/logout', () => {
    beforeEach(async () => {
      // Create a user to log in with
      await User.create({ username: 'testuser', email: 'testuser@example.com', password: 'password123' })
    })

    it('should log out a user and redirect to /auth/login', async () => {
      // First, log in
      const agent = request.agent(app)
      await agent
        .post('/auth/login')
        .send({ username: 'testuser', password: 'password123' })

      // Then, log out
      const res = await agent.get('/auth/logout')

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toBe('/auth/login')
    })
  })
})
