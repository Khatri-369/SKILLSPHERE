import request from 'supertest';
import app from '../src/app.js';
import Gig from '../src/models/gig.model.js';
import Proposal from '../src/models/proposal.model.js';
import Review from '../src/models/review.model.js';
import { connectTestDB, closeTestDB, clearTestDB, createTestUser } from './setup.js';

describe('Review APIs', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('POST /api/v1/reviews', () => {
    it('should submit a review successfully if there is an accepted hire connection', async () => {
      const { user: client, accessToken: clientToken } = await createTestUser('Client');
      const { user: freelancer } = await createTestUser('Freelancer');

      const gig = await Gig.create({
        client: client._id,
        title: 'Review Project',
        description: 'E-commerce UI/UX project',
        budget: 500,
        category: 'Design',
        deadline: new Date('2026-12-31'),
        status: 'Published',
      });

      await Proposal.create({
        gig: gig._id,
        freelancer: freelancer._id,
        bidAmount: 500,
        estimatedTime: '5 days',
        description: 'Proposal desc',
        status: 'Accepted',
      });

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          gigId: gig._id,
          reviewedUserId: freelancer._id,
          rating: 5,
          comment: 'Outstanding freelancer, highly recommended!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.comment).toBe('Outstanding freelancer, highly recommended!');
    });

    it('should reject review submission if rating is out of bounds (1-5)', async () => {
      const { user: client, accessToken: clientToken } = await createTestUser('Client');
      const { user: freelancer } = await createTestUser('Freelancer');

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          gigId: '60b9d7a22f4f2c001fba42ff',
          reviewedUserId: freelancer._id,
          rating: 6, // Invalid
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('must be an integer between 1 and 5');
    });

    it('should prevent user from reviewing themselves', async () => {
      const { user: client, accessToken: clientToken } = await createTestUser('Client');

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          gigId: '60b9d7a22f4f2c001fba42ff',
          reviewedUserId: client._id,
          rating: 5,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('cannot review yourself');
    });
  });

  describe('GET /api/v1/reviews/user/:userId & analytics/:userId', () => {
    it('should retrieve user reviews and aggregate analytics', async () => {
      const { user: client } = await createTestUser('Client');
      const { user: freelancer } = await createTestUser('Freelancer');

      // Create dummy review in DB
      await Review.create({
        reviewer: client._id,
        reviewedUser: freelancer._id,
        gig: '60b9d7a22f4f2c001fba42ff',
        rating: 4,
        comment: 'Very good quality',
        isVerified: true,
      });

      // Get Reviews
      const reviewRes = await request(app)
        .get(`/api/v1/reviews/user/${freelancer._id}`);
      
      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.data.reviews.length).toBe(1);

      // Get Analytics
      const analyticsRes = await request(app)
        .get(`/api/v1/reviews/analytics/${freelancer._id}`);

      expect(analyticsRes.status).toBe(200);
      expect(analyticsRes.body.data.averageRating).toBe(4);
      expect(analyticsRes.body.data.totalReviews).toBe(1);
      expect(analyticsRes.body.data.ratingDistribution['4']).toBe(1);
    });
  });
});
