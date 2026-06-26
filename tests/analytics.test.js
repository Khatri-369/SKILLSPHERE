import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, closeTestDB, clearTestDB, createTestUser } from './setup.js';

describe('Analytics APIs', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('GET /api/v1/analytics/client', () => {
    it('should retrieve client analytics successfully', async () => {
      const { accessToken } = await createTestUser('Client');

      const res = await request(app)
        .get('/api/v1/analytics/client')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalSpend).toBeDefined();
      expect(res.body.data.gigsPublished).toBeDefined();
    });

    it('should reject client analytics if requested by a Freelancer', async () => {
      const { accessToken } = await createTestUser('Freelancer');

      const res = await request(app)
        .get('/api/v1/analytics/client')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/analytics/freelancer', () => {
    it('should retrieve freelancer analytics successfully', async () => {
      const { accessToken } = await createTestUser('Freelancer');

      const res = await request(app)
        .get('/api/v1/analytics/freelancer')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.gigsCompleted).toBeDefined();
      expect(res.body.data.revenueGraph).toBeDefined();
    });

    it('should reject freelancer analytics if requested by a Client', async () => {
      const { accessToken } = await createTestUser('Client');

      const res = await request(app)
        .get('/api/v1/analytics/freelancer')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
    });
  });
});
