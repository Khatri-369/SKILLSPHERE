import { jest } from '@jest/globals';
import request from 'supertest';

// Native ESM Mocking: unstable_mockModule must run BEFORE importing modules that use it
jest.unstable_mockModule('../src/utils/cloudinary.js', () => ({
  uploadToCloudinary: jest.fn().mockResolvedValue({ secure_url: 'https://res.cloudinary.com/mock-upload.png' }),
}));

// Now dynamically import app and helpers
const { default: app } = await import('../src/app.js');
const { default: Gig } = await import('../src/models/gig.model.js');
const { connectTestDB, closeTestDB, clearTestDB, createTestUser } = await import('./setup.js');

describe('Gig Management APIs', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('POST /api/v1/gigs', () => {
    it('should create a gig successfully when requested by a Client user', async () => {
      const { user, accessToken } = await createTestUser('Client');

      const res = await request(app)
        .post('/api/v1/gigs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Develop a Web Application',
          description: 'Need a senior React developer to build an e-commerce dashboard.',
          budget: 1500,
          category: 'Software Development',
          deadline: '2026-12-31',
          skillsRequired: 'react, node, tailwind',
          milestones: JSON.stringify([
            { title: 'Milestone 1: Design', description: 'Complete UI layout', amount: 500 },
            { title: 'Milestone 2: Frontend', description: 'Complete API integrations', amount: 1000 },
          ]),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Develop a Web Application');
      expect(res.body.data.client._id).toBe(user._id.toString());
      expect(res.body.data.skillsRequired).toEqual(['react', 'node', 'tailwind']);
      expect(res.body.data.milestones.length).toBe(2);
      expect(res.body.data.status).toBe('Draft');
    });

    it('should reject gig creation if user role is not Client', async () => {
      const { accessToken } = await createTestUser('Freelancer');

      const res = await request(app)
        .post('/api/v1/gigs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Freelancer project post test',
          description: 'This should fail',
          budget: 100,
          category: 'Writing',
          deadline: '2026-12-31',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject gig creation with missing fields', async () => {
      const { accessToken } = await createTestUser('Client');

      const res = await request(app)
        .post('/api/v1/gigs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Incomplete Gig',
          // missing description, budget, category, deadline
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Title, description, budget, category, and deadline are required');
    });

    it('should reject gig creation with a negative budget', async () => {
      const { accessToken } = await createTestUser('Client');

      const res = await request(app)
        .post('/api/v1/gigs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Underfunded project',
          description: 'We pay in exposure',
          budget: -50,
          category: 'Design',
          deadline: '2026-12-31',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Budget cannot be negative');
    });
  });

  describe('PATCH /api/v1/gigs/:gigId', () => {
    it('should update gig details successfully if requested by the client owner', async () => {
      const { user, accessToken } = await createTestUser('Client');
      const gig = await Gig.create({
        client: user._id,
        title: 'Original Gig',
        description: 'Original description',
        budget: 100,
        category: 'Logo Design',
        deadline: new Date('2026-10-10'),
      });

      const res = await request(app)
        .patch(`/api/v1/gigs/${gig._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Updated Gig Title',
          budget: 150,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Gig Title');
      expect(res.body.data.budget).toBe(150);
    });

    it('should prevent editing if the gig belongs to a different client', async () => {
      const { user: clientA } = await createTestUser('Client');
      const { accessToken: tokenB } = await createTestUser('Client');
      
      const gig = await Gig.create({
        client: clientA._id,
        title: 'Gig owned by A',
        description: 'Original description',
        budget: 100,
        category: 'Logo Design',
        deadline: new Date('2026-10-10'),
      });

      const res = await request(app)
        .patch(`/api/v1/gigs/${gig._id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          title: 'Malicious title change attempt',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('You do not own this gig');
    });
  });

  describe('DELETE /api/v1/gigs/:gigId', () => {
    it('should delete a gig successfully if owned by the client', async () => {
      const { user, accessToken } = await createTestUser('Client');
      const gig = await Gig.create({
        client: user._id,
        title: 'Gig to delete',
        description: 'Original description',
        budget: 100,
        category: 'Writing',
        deadline: new Date('2026-10-10'),
      });

      const res = await request(app)
        .delete(`/api/v1/gigs/${gig._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const searchGig = await Gig.findById(gig._id);
      expect(searchGig).toBeNull();
    });
  });

  describe('PATCH /api/v1/gigs/:gigId/publish & close', () => {
    it('should publish a draft gig successfully and transition status to Published', async () => {
      const { user, accessToken } = await createTestUser('Client');
      const gig = await Gig.create({
        client: user._id,
        title: 'Draft Gig',
        description: 'Description',
        budget: 100,
        category: 'Writing',
        deadline: new Date('2026-10-10'),
        status: 'Draft',
      });

      const res = await request(app)
        .patch(`/api/v1/gigs/${gig._id}/publish`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Published');
    });

    it('should close a published gig successfully and transition status to Closed', async () => {
      const { user, accessToken } = await createTestUser('Client');
      const gig = await Gig.create({
        client: user._id,
        title: 'Published Gig',
        description: 'Description',
        budget: 100,
        category: 'Writing',
        deadline: new Date('2026-10-10'),
        status: 'Published',
      });

      const res = await request(app)
        .patch(`/api/v1/gigs/${gig._id}/close`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Closed');
    });
  });
});
