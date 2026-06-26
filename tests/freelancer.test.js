import request from 'supertest';
import app from '../src/app.js';
import FreelancerProfile from '../src/models/freelancerProfile.model.js';
import { connectTestDB, closeTestDB, clearTestDB, createTestUser } from './setup.js';

describe('Freelancer Profile APIs', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('POST /api/v1/freelancers', () => {
    it('should create a freelancer profile successfully for a Freelancer user', async () => {
      const { user, accessToken } = await createTestUser('Freelancer');

      const res = await request(app)
        .post('/api/v1/freelancers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          skills: ['javascript', 'express', 'mongodb'],
          skillLevel: 'Expert',
          hourlyRate: 50,
          languages: ['English', 'Hindi'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.owner._id).toBe(user._id.toString());
      expect(res.body.data.skills).toEqual(['javascript', 'express', 'mongodb']);
      expect(res.body.data.skillLevel).toBe('Expert');
      expect(res.body.data.hourlyRate).toBe(50);
      expect(res.body.data.verificationBadge).toBe(false); // Make sure it defaults to false
    });

    it('should reject profile creation if role is not Freelancer', async () => {
      const { accessToken } = await createTestUser('Client'); // Role: Client

      const res = await request(app)
        .post('/api/v1/freelancers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          skills: ['design'],
          hourlyRate: 40,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('is not authorized');
    });

    it('should prevent duplicate freelancer profile creation', async () => {
      const { user, accessToken } = await createTestUser('Freelancer');
      
      // Pre-create profile
      await FreelancerProfile.create({
        owner: user._id,
        skills: ['react'],
        hourlyRate: 35,
      });

      const res = await request(app)
        .post('/api/v1/freelancers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          skills: ['node'],
          hourlyRate: 35,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('GET /api/v1/freelancers/me', () => {
    it('should retrieve own freelancer profile successfully', async () => {
      const { user, accessToken } = await createTestUser('Freelancer');
      await FreelancerProfile.create({
        owner: user._id,
        skills: ['react'],
        hourlyRate: 35,
      });

      const res = await request(app)
        .get('/api/v1/freelancers/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.skills).toEqual(['react']);
    });

    it('should return 404 if profile has not been created yet', async () => {
      const { accessToken } = await createTestUser('Freelancer');

      const res = await request(app)
        .get('/api/v1/freelancers/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });
  });

  describe('GET /api/v1/freelancers/:userId', () => {
    it('should return public freelancer profile and increment view count', async () => {
      const { user } = await createTestUser('Freelancer');
      const profile = await FreelancerProfile.create({
        owner: user._id,
        skills: ['vue'],
        hourlyRate: 35,
      });

      // View first time
      const res = await request(app)
        .get(`/api/v1/freelancers/${user._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.skills).toEqual(['vue']);
      expect(res.body.data.profileViews).toBe(1);

      // Verify DB view increment
      const updatedProfile = await FreelancerProfile.findById(profile._id);
      expect(updatedProfile.profileViews).toBe(1);
    });

    it('should return 404 if requested user profile does not exist', async () => {
      const res = await request(app)
        .get('/api/v1/freelancers/60b9d7a22f4f2c001fba42ff'); // Non-existent ID

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/freelancers', () => {
    it('should update freelancer profile fields successfully', async () => {
      const { user, accessToken } = await createTestUser('Freelancer');
      await FreelancerProfile.create({
        owner: user._id,
        skills: ['angular'],
        availability: 'Available',
        hourlyRate: 35,
      });

      const res = await request(app)
        .patch('/api/v1/freelancers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          skills: ['angular', 'rxjs'],
          availability: 'Busy',
          hourlyRate: 80,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.skills).toEqual(['angular', 'rxjs']);
      expect(res.body.data.availability).toBe('Busy');
      expect(res.body.data.hourlyRate).toBe(80);
    });
  });

  describe('DELETE /api/v1/freelancers', () => {
    it('should delete freelancer profile successfully', async () => {
      const { user, accessToken } = await createTestUser('Freelancer');
      await FreelancerProfile.create({
        owner: user._id,
        skills: ['angular'],
        hourlyRate: 35,
      });

      const res = await request(app)
        .delete('/api/v1/freelancers')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const profile = await FreelancerProfile.findOne({ owner: user._id });
      expect(profile).toBeNull();
    });
  });
});
