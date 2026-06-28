import { jest } from '@jest/globals';
import request from 'supertest';

// Native ESM Mocking: unstable_mockModule must run BEFORE importing modules that use it
jest.unstable_mockModule('../src/utils/cloudinary.js', () => ({
  uploadToCloudinary: jest.fn().mockResolvedValue({ secure_url: 'https://res.cloudinary.com/mock-upload.png' }),
}));

// Now dynamically import app and helpers
const { default: app } = await import('../src/app.js');
const { default: Gig } = await import('../src/models/gig.model.js');
const { default: Proposal } = await import('../src/models/proposal.model.js');
const { connectTestDB, closeTestDB, clearTestDB, createTestUser } = await import('./setup.js');

describe('Proposal APIs', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('POST /api/v1/proposals', () => {
    it('should submit a proposal successfully when requested by a Freelancer', async () => {
      const { user: client } = await createTestUser('Client');
      const { user: freelancer, accessToken } = await createTestUser('Freelancer');

      const gig = await Gig.create({
        client: client._id,
        title: 'Need a designer',
        description: 'E-commerce UI/UX project',
        budget: 500,
        category: 'Design',
        deadline: new Date('2026-12-31'),
        status: 'Published',
      });

      const res = await request(app)
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          gigId: gig._id,
          bidAmount: 450,
          estimatedTime: '5 days',
          description: 'I can do this in 5 days with Figma.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.freelancer._id).toBe(freelancer._id.toString());
      expect(res.body.data.gig._id).toBe(gig._id.toString()); // Gig is populated/returned as object in controller
      expect(res.body.data.bidAmount).toBe(450);
    });

    it('should reject proposal submission if requested by a Client user', async () => {
      const { user: client, accessToken } = await createTestUser('Client');
      
      const gig = await Gig.create({
        client: client._id,
        title: 'Need a designer',
        description: 'E-commerce UI/UX project',
        budget: 500,
        category: 'Design',
        deadline: new Date('2026-12-31'),
        status: 'Published',
      });

      const res = await request(app)
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          gigId: gig._id,
          bidAmount: 400,
          estimatedTime: '2 days',
          description: 'Client applying to their own gig',
        });

      expect(res.status).toBe(403);
    });

    it('should allow submitting a proposal if a previous proposal was withdrawn', async () => {
      const { user: client } = await createTestUser('Client');
      const { user: freelancer, accessToken } = await createTestUser('Freelancer');

      const gig = await Gig.create({
        client: client._id,
        title: 'Need a designer',
        description: 'E-commerce UI/UX project',
        budget: 500,
        category: 'Design',
        deadline: new Date('2026-12-31'),
        status: 'Published',
      });

      // Create a withdrawn proposal
      await Proposal.create({
        gig: gig._id,
        freelancer: freelancer._id,
        bidAmount: 450,
        estimatedTime: '5 days',
        description: 'I can do this in 5 days with Figma.',
        status: 'Withdrawn',
      });

      // Submit new proposal on same gig
      const res = await request(app)
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          gigId: gig._id,
          bidAmount: 420,
          estimatedTime: '4 days',
          description: 'New improved offer for Figma design.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bidAmount).toBe(420);
    });
  });

  describe('PATCH /api/v1/proposals/:proposalId/accept & reject', () => {
    it('should allow the client owner to accept a proposal', async () => {
      const { user: client, accessToken: clientToken } = await createTestUser('Client');
      const { user: freelancer } = await createTestUser('Freelancer');

      const gig = await Gig.create({
        client: client._id,
        title: 'Need a logo designer',
        description: 'Create brand assets',
        budget: 300,
        category: 'Design',
        deadline: new Date('2026-12-31'),
        status: 'Published',
      });

      const proposal = await Proposal.create({
        gig: gig._id,
        freelancer: freelancer._id,
        bidAmount: 300,
        estimatedTime: '3 days',
        description: 'My proposal description',
      });

      const res = await request(app)
        .patch(`/api/v1/proposals/${proposal._id}/accept`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Accepted');

      const updatedProposal = await Proposal.findById(proposal._id);
      expect(updatedProposal.status).toBe('Accepted');
    });

    it('should allow the client owner to reject a proposal', async () => {
      const { user: client, accessToken: clientToken } = await createTestUser('Client');
      const { user: freelancer } = await createTestUser('Freelancer');

      const gig = await Gig.create({
        client: client._id,
        title: 'Need a logo designer',
        description: 'Create brand assets',
        budget: 300,
        category: 'Design',
        deadline: new Date('2026-12-31'),
        status: 'Published',
      });

      const proposal = await Proposal.create({
        gig: gig._id,
        freelancer: freelancer._id,
        bidAmount: 300,
        estimatedTime: '3 days',
        description: 'My proposal description',
      });

      const res = await request(app)
        .patch(`/api/v1/proposals/${proposal._id}/reject`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Rejected');
    });
  });

  describe('GET /api/v1/proposals/me', () => {
    it('should return my proposals for Freelancer', async () => {
      const { user: client } = await createTestUser('Client');
      const { user: freelancer, accessToken } = await createTestUser('Freelancer');

      const gig = await Gig.create({
        client: client._id,
        title: 'Need a logo designer',
        description: 'Create brand assets',
        budget: 300,
        category: 'Design',
        deadline: new Date('2026-12-31'),
        status: 'Published',
      });

      await Proposal.create({
        gig: gig._id,
        freelancer: freelancer._id,
        bidAmount: 300,
        estimatedTime: '3 days',
        description: 'My proposal description',
      });

      const res = await request(app)
        .get('/api/v1/proposals/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });
  });
});
