import request from 'supertest';
import app from '../src/app.js';
import Gig from '../src/models/gig.model.js';
import FreelancerProfile from '../src/models/freelancerProfile.model.js';
import { connectTestDB, closeTestDB, clearTestDB, createTestUser } from './setup.js';

describe('Search & Filter APIs', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('GET /api/v1/search/gigs', () => {
    it('should search and filter gigs correctly', async () => {
      const { user: client } = await createTestUser('Client');

      // Create a few gigs with different titles and categories
      await Gig.create({
        client: client._id,
        title: 'React Native Developer Needed',
        description: 'Build a mobile app',
        budget: 800,
        category: 'Mobile Dev',
        deadline: new Date('2026-12-31'),
        status: 'Published',
      });

      await Gig.create({
        client: client._id,
        title: 'Python Backend Engineer',
        description: 'Build a Django backend API',
        budget: 1500,
        category: 'Web Dev',
        deadline: new Date('2026-12-31'),
        status: 'Published',
      });

      // Filter by keyword query
      const searchRes = await request(app)
        .get('/api/v1/search/gigs?q=python');

      expect(searchRes.status).toBe(200);
      expect(searchRes.body.success).toBe(true);
      expect(searchRes.body.data.gigs.length).toBe(1);
      expect(searchRes.body.data.gigs[0].title).toBe('Python Backend Engineer');

      // Filter by category
      const categoryRes = await request(app)
        .get('/api/v1/search/gigs?category=Mobile Dev');

      expect(categoryRes.status).toBe(200);
      expect(categoryRes.body.data.gigs.length).toBe(1);
      expect(categoryRes.body.data.gigs[0].title).toBe('React Native Developer Needed');

      // Filter by budget min/max (using correct query parameter name minBudget)
      const budgetRes = await request(app)
        .get('/api/v1/search/gigs?minBudget=1000');

      expect(budgetRes.status).toBe(200);
      expect(budgetRes.body.data.gigs.length).toBe(1);
      expect(budgetRes.body.data.gigs[0].title).toBe('Python Backend Engineer');
    });
  });

  describe('GET /api/v1/search/freelancers', () => {
    it('should search and filter freelancers correctly', async () => {
      const { user: freelancerA } = await createTestUser('Freelancer');
      const { user: freelancerB } = await createTestUser('Freelancer');

      await FreelancerProfile.create({
        owner: freelancerA._id,
        skills: ['react', 'redux'],
        skillLevel: 'Expert',
        availability: 'Available',
        hourlyRate: 50,
      });

      await FreelancerProfile.create({
        owner: freelancerB._id,
        skills: ['python', 'django'],
        skillLevel: 'Intermediate',
        availability: 'Busy',
        hourlyRate: 35,
      });

      // Filter by skill
      const skillRes = await request(app)
        .get('/api/v1/search/freelancers?skills=react');

      expect(skillRes.status).toBe(200);
      expect(skillRes.body.success).toBe(true);
      expect(skillRes.body.data.freelancers.length).toBe(1);
      expect(skillRes.body.data.freelancers[0].skills).toContain('react');

      // Filter by availability
      const availabilityRes = await request(app)
        .get('/api/v1/search/freelancers?availability=Busy');

      expect(availabilityRes.status).toBe(200);
      expect(availabilityRes.body.data.freelancers.length).toBe(1);
      expect(availabilityRes.body.data.freelancers[0].availability).toBe('Busy');
    });
  });
});
