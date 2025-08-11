const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Membership = require('../models/Membership');

describe('Organization Management Routes', () => {
  let ownerAgent;
  let viewerAgent;
  let ownerUser;
  let viewerUser;
  let testOrg;
  let viewerMembership;

  beforeEach(async () => {
    // Clean up
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Membership.deleteMany({});

    // 1. Create the Owner user and their organization
    await request(app).post('/auth/register').send({ username: 'owner', email: 'owner@test.com', password: 'password' });
    ownerUser = await User.findOne({ email: 'owner@test.com' });
    testOrg = await Organization.findOne({ owner: ownerUser._id });

    // 2. Create the Viewer user
    await request(app).post('/auth/register').send({ username: 'viewer', email: 'viewer@test.com', password: 'password' });
    viewerUser = await User.findOne({ email: 'viewer@test.com' });

    // 3. Create a membership for the viewer in the owner's organization
    viewerMembership = await Membership.create({
      user: viewerUser._id,
      organization: testOrg._id,
      role: 'Viewer',
    });

    // 4. Log in both users to get authenticated agents
    ownerAgent = request.agent(app);
    await ownerAgent.post('/auth/login').send({ username: 'owner', password: 'password' });

    viewerAgent = request.agent(app);
    await viewerAgent.post('/auth/login').send({ username: 'viewer', password: 'password' });

    // Manually set the viewer's current organization to the owner's org for testing
    await User.findByIdAndUpdate(viewerUser._id, { currentOrganization: testOrg._id });
    await viewerAgent.post('/auth/login').send({ username: 'viewer', password: 'password' });
  });

  describe('GET /organization/manage', () => {
    it('should allow an Owner to view the management page', async () => {
      const res = await ownerAgent.get('/organization/manage');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('Manage Organization');
    });

    it('should forbid a Viewer from viewing the management page', async () => {
      const res = await viewerAgent.get('/organization/manage');
      expect(res.statusCode).toBe(403);
    });
  });

  describe('POST /organization/invite', () => {
    it('should allow an Owner to invite an existing user', async () => {
      // Create a user to invite
      await request(app).post('/auth/register').send({ username: 'invitee', email: 'invitee@test.com', password: 'password' });

      const res = await ownerAgent
        .post('/organization/invite')
        .send({ email: 'invitee@test.com', role: 'Editor' });

      expect(res.statusCode).toBe(302); // Redirects back to manage page

      const inviteeUser = await User.findOne({ email: 'invitee@test.com' });
      const newMembership = await Membership.findOne({ user: inviteeUser._id, organization: testOrg._id });
      expect(newMembership).not.toBeNull();
      expect(newMembership.role).toBe('Editor');
    });
  });

  describe('POST /organization/member/:membershipId/update-role', () => {
    it("should allow an Owner to update a member's role", async () => {
      const res = await ownerAgent
        .post(`/organization/member/${viewerMembership._id}/update-role`)
        .send({ role: 'Editor' });

      expect(res.statusCode).toBe(302);

      const updatedMembership = await Membership.findById(viewerMembership._id);
      expect(updatedMembership.role).toBe('Editor');
    });
  });

  describe('POST /organization/member/:membershipId/remove', () => {
    it('should allow an Owner to remove a member', async () => {
      const res = await ownerAgent
        .post(`/organization/member/${viewerMembership._id}/remove`);

      expect(res.statusCode).toBe(302);

      const removedMembership = await Membership.findById(viewerMembership._id);
      expect(removedMembership).toBeNull();
    });
  });
});
