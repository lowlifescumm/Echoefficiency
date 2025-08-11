const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Membership = require('../models/Membership');
const FeedbackForm = require('../models/FeedbackForm');

describe('Feedback Routes', () => {
  let agent;
  let user;
  let organization;

  beforeEach(async () => {
    // Clean up the database
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Membership.deleteMany({});
    await FeedbackForm.deleteMany({});

    // Register a new user, which also creates an organization and membership
    await request(app)
      .post('/auth/register')
      .send({ username: 'testuser', email: 'testuser@example.com', password: 'password123' });

    user = await User.findOne({ username: 'testuser' });
    organization = await Organization.findOne({ owner: user._id });

    // Log in the user to get a session
    agent = request.agent(app);
    await agent
      .post('/auth/login')
      .send({ username: 'testuser', password: 'password123' });
  });

  describe('POST /create-form', () => {
    it('should create a new feedback form associated with the user\'s organization', async () => {
      const formPayload = {
        title: 'My Test Form',
        questions: [{ questionText: 'How was it?', questionType: 'text' }],
      };

      const res = await agent
        .post('/create-form')
        .send(formPayload);

      // The route redirects to /success
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('/success');

      // Verify the form was created in the database
      const form = await FeedbackForm.findOne({ title: 'My Test Form' });
      expect(form).not.toBeNull();
      expect(form.ownerId.toString()).toBe(user._id.toString());
      expect(form.organization.toString()).toBe(organization._id.toString());
    });
  });

  describe('GET /dashboard', () => {
    it('should only show forms belonging to the user\'s organization', async () => {
      // Create a form for the primary user's organization
      await FeedbackForm.create({
        ownerId: user._id,
        organization: organization._id,
        title: 'My Form',
        questions: [{ questionText: 'Q1', questionType: 'text' }],
      });

      // Create a second user and organization
      await request(app)
        .post('/auth/register')
        .send({ username: 'otheruser', email: 'other@example.com', password: 'password123' });
      const otherUser = await User.findOne({ username: 'otheruser' });
      const otherOrg = await Organization.findOne({ owner: otherUser._id });

      // Create a form for the second organization
      await FeedbackForm.create({
        ownerId: otherUser._id,
        organization: otherOrg._id,
        title: 'Other Form',
        questions: [{ questionText: 'Q2', questionType: 'text' }],
      });

      // Fetch the dashboard as the primary user
      const res = await agent.get('/dashboard');

      expect(res.statusCode).toBe(200);
      // The response should contain "My Form" but not "Other Form"
      expect(res.text).toContain('My Form');
      expect(res.text).not.toContain('Other Form');
    });
  });
  describe('RBAC Middleware', () => {
    it('should prevent a user with a "Viewer" role from creating a form', async () => {
      // Create a second user to be our "Viewer"
      await request(app)
        .post('/auth/register')
        .send({ username: 'vieweruser', email: 'viewer@example.com', password: 'password123' });
      const viewerUser = await User.findOne({ username: 'vieweruser' });

      // Create a membership for the viewer in the main user's organization
      await Membership.create({
        user: viewerUser._id,
        organization: organization._id,
        role: 'Viewer',
      });

      // Log in as the viewer
      const viewerAgent = request.agent(app);
      await viewerAgent
        .post('/auth/login')
        .send({ username: 'vieweruser', password: 'password123' });

      // The viewer needs to have their current organization set in the session.
      // The login route does this, but we need to ensure it's the *correct* one.
      // Let's manually set the currentOrganization for the viewer user for this test.
      await User.findByIdAndUpdate(viewerUser._id, { currentOrganization: organization._id });
      // Re-login to update the session
      await viewerAgent
        .post('/auth/login')
        .send({ username: 'vieweruser', password: 'password123' });

      const formPayload = {
        title: 'Viewer Test Form',
        questions: [{ questionText: 'Should not be created', questionType: 'text' }],
      };

      const res = await viewerAgent
        .post('/create-form')
        .send(formPayload);

      // Expect a 403 Forbidden error
      expect(res.statusCode).toBe(403);

      // Verify the form was NOT created
      const form = await FeedbackForm.findOne({ title: 'Viewer Test Form' });
      expect(form).toBeNull();
    });
  });
});
