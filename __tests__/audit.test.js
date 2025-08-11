const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Membership = require('../models/Membership');
const FeedbackForm = require('../models/FeedbackForm');
const FeedbackSubmission = require('../models/FeedbackSubmission');
const AuditLog = require('../models/AuditLog');

describe('Audit Log and Export Routes', () => {
  let ownerAgent, analystAgent, viewerAgent;
  let ownerUser, analystUser, viewerUser;
  let testOrg;
  let testForm;

  beforeEach(async () => {
    // Clean up
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Membership.deleteMany({});
    await FeedbackForm.deleteMany({});
    await FeedbackSubmission.deleteMany({});
    await AuditLog.deleteMany({});

    // 1. Create Owner
    await request(app).post('/auth/register').send({ username: 'owner', email: 'owner@test.com', password: 'password' });
    ownerUser = await User.findOne({ email: 'owner@test.com' });
    testOrg = await Organization.findOne({ owner: ownerUser._id });

    // 2. Create Analyst
    await request(app).post('/auth/register').send({ username: 'analyst', email: 'analyst@test.com', password: 'password' });
    analystUser = await User.findOne({ email: 'analyst@test.com' });
    await Membership.create({ user: analystUser._id, organization: testOrg._id, role: 'Analyst' });
    await User.findByIdAndUpdate(analystUser._id, { currentOrganization: testOrg._id });

    // 3. Create Viewer
    await request(app).post('/auth/register').send({ username: 'viewer', email: 'viewer@test.com', password: 'password' });
    viewerUser = await User.findOne({ email: 'viewer@test.com' });
    await Membership.create({ user: viewerUser._id, organization: testOrg._id, role: 'Viewer' });
    await User.findByIdAndUpdate(viewerUser._id, { currentOrganization: testOrg._id });

    // 4. Log in agents
    ownerAgent = request.agent(app);
    await ownerAgent.post('/auth/login').send({ username: 'owner', password: 'password' });
    analystAgent = request.agent(app);
    await analystAgent.post('/auth/login').send({ username: 'analyst', password: 'password' });
    viewerAgent = request.agent(app);
    await viewerAgent.post('/auth/login').send({ username: 'viewer', password: 'password' });

    // 5. Create a form and a submission
    testForm = await FeedbackForm.create({
        ownerId: ownerUser._id,
        organization: testOrg._id,
        title: 'Export Test Form',
        questions: [{ questionText: 'Rating', questionType: 'rating' }],
    });
    await FeedbackSubmission.create({
        formId: testForm._id,
        responses: { 'Rating': '5' }
    });
  });

  describe('GET /form/:formId/export/csv', () => {
    it('should allow an Analyst to export CSV and create an audit log', async () => {
      const res = await analystAgent.get(`/form/${testForm._id}/export/csv`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Submitted At,Rating');
      expect(res.text).toContain('5');

      // Verify audit log was created
      const log = await AuditLog.findOne({ action: 'export_csv' });
      expect(log).not.toBeNull();
      expect(log.user.toString()).toBe(analystUser._id.toString());
      expect(log.organization.toString()).toBe(testOrg._id.toString());
      expect(log.details.get('formId')).toBe(testForm._id.toString());
    });

    it('should forbid a Viewer from exporting CSV', async () => {
      const res = await viewerAgent.get(`/form/${testForm._id}/export/csv`);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /organization/audit-log', () => {
    it('should allow an Owner to view the audit log page', async () => {
      // First, perform an action to log
      await analystAgent.get(`/form/${testForm._id}/export/csv`);

      const res = await ownerAgent.get('/organization/audit-log');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('Audit Log');
      expect(res.text).toContain('export_csv');
      expect(res.text).toContain('analyst'); // The user who performed the action
    });

    it('should forbid an Analyst from viewing the audit log page', async () => {
      const res = await analystAgent.get('/organization/audit-log');
      expect(res.statusCode).toBe(403);
    });
  });
});
