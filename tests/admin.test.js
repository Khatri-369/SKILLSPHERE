import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Gig from '../src/models/gig.model.js';
import FreelancerProfile from '../src/models/freelancerProfile.model.js';
import { connectTestDB, closeTestDB, clearTestDB, createTestUser } from './setup.js';

describe('Admin APIs', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('Admin Authorization Check', () => {
    it('should reject access to non-admin users', async () => {
      const { accessToken } = await createTestUser('Client'); // Non-Admin

      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('is not authorized');
    });
  });

  describe('GET /api/v1/admin/users', () => {
    it('should return a paginated list of all users for Admin', async () => {
      const { accessToken } = await createTestUser('Admin');
      await createTestUser('Client');
      await createTestUser('Freelancer');

      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('PATCH /api/v1/admin/users/:userId/suspend', () => {
    it('should suspend and unsuspend a user account', async () => {
      const { accessToken } = await createTestUser('Admin');
      const { user: client } = await createTestUser('Client');

      // Suspend
      const suspendRes = await request(app)
        .patch(`/api/v1/admin/users/${client._id}/suspend`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isSuspended: true });

      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.data.isSuspended).toBe(true);

      const dbUser = await User.findById(client._id);
      expect(dbUser.isSuspended).toBe(true);

      // Unsuspend
      const unsuspendRes = await request(app)
        .patch(`/api/v1/admin/users/${client._id}/suspend`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isSuspended: false });

      expect(unsuspendRes.status).toBe(200);
      expect(unsuspendRes.body.data.isSuspended).toBe(false);
    });
  });

  describe('PATCH /api/v1/admin/gigs/:gigId/approve', () => {
    it('should toggle approval state of a gig', async () => {
      const { accessToken } = await createTestUser('Admin');
      const { user: client } = await createTestUser('Client');
      const gig = await Gig.create({
        client: client._id,
        title: 'Approve Gig Test',
        description: 'Testing approval',
        budget: 500,
        category: 'Development',
        deadline: new Date('2026-12-31'),
        isApproved: false,
      });

      const approveRes = await request(app)
        .patch(`/api/v1/admin/gigs/${gig._id}/approve`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isApproved: true });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.isApproved).toBe(true);

      const dbGig = await Gig.findById(gig._id);
      expect(dbGig.isApproved).toBe(true);
    });
  });

  describe('PATCH /api/v1/admin/freelancers/:profileId/verify', () => {
    it('should toggle verification status of a freelancer profile', async () => {
      const { accessToken } = await createTestUser('Admin');
      const { user: freelancer } = await createTestUser('Freelancer');
      const profile = await FreelancerProfile.create({
        owner: freelancer._id,
        skills: ['react'],
        verificationBadge: false,
        hourlyRate: 30,
      });

      const verifyRes = await request(app)
        .patch(`/api/v1/admin/freelancers/${profile._id}/verify`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ verificationBadge: true });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.verificationBadge).toBe(true);

      const dbProfile = await FreelancerProfile.findById(profile._id);
      expect(dbProfile.verificationBadge).toBe(true);
    });
  });

  describe('GET /api/v1/admin/analytics', () => {
    it('should retrieve overall platform analytics', async () => {
      const { accessToken } = await createTestUser('Admin');

      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalRevenue).toBeDefined();
      expect(res.body.data.activeFreelancers).toBeDefined();
      expect(res.body.data.revenueTimeline).toBeDefined();
    });
  });
});
