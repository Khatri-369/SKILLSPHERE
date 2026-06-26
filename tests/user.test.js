import { jest } from '@jest/globals';
import request from 'supertest';

// Native ESM Mocking: unstable_mockModule must run BEFORE importing modules that use it
jest.unstable_mockModule('../src/utils/cloudinary.js', () => ({
  uploadToCloudinary: jest.fn().mockResolvedValue({ secure_url: 'https://res.cloudinary.com/mock-upload.png' }),
}));

// Now dynamically import app and helpers
const { default: app } = await import('../src/app.js');
const { connectTestDB, closeTestDB, clearTestDB, createTestUser } = await import('./setup.js');

describe('User Profile APIs', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('PATCH /api/v1/users/profile', () => {
    it('should update profile fields successfully', async () => {
      const { user, accessToken } = await createTestUser('Client');

      const res = await request(app)
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bio: 'Fullstack developer specialized in Node.js',
          location: 'San Francisco, CA',
          phone: '+15550199',
          portfolio: 'https://myportfolio.com',
          skills: 'javascript, node, react',
          experience: JSON.stringify([
            {
              title: 'Software Engineer',
              company: 'Tech Corp',
              startDate: '2023-01-01',
              description: 'Building backend microservices',
            },
          ]),
          education: JSON.stringify([
            {
              school: 'Stanford University',
              degree: 'Bachelor of Science',
              fieldOfStudy: 'Computer Science',
            },
          ]),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bio).toBe('Fullstack developer specialized in Node.js');
      expect(res.body.data.location).toBe('San Francisco, CA');
      expect(res.body.data.phone).toBe('+15550199');
      expect(res.body.data.portfolio).toBe('https://myportfolio.com');
      expect(res.body.data.skills).toEqual(['javascript', 'node', 'react']);
      expect(res.body.data.experience.length).toBe(1);
      expect(res.body.data.experience[0].title).toBe('Software Engineer');
      expect(res.body.data.education[0].school).toBe('Stanford University');
    });

    it('should return 400 validation error if experience has an invalid JSON format', async () => {
      const { accessToken } = await createTestUser('Client');

      const res = await request(app)
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          experience: '{invalid-json',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid experience format');
    });

    it('should return 400 validation error if education has an invalid JSON format', async () => {
      const { accessToken } = await createTestUser('Client');

      const res = await request(app)
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          education: '{invalid-json',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid education format');
    });

    it('should return 401 when token is missing', async () => {
      const res = await request(app)
        .patch('/api/v1/users/profile')
        .send({
          bio: 'Bio update without authentication',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when attempting to upload an invalid file format (e.g. .html)', async () => {
      const { accessToken } = await createTestUser('Client');

      const res = await request(app)
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('avatar', Buffer.from('<html></html>'), {
          filename: 'hacker.html',
          contentType: 'text/html',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid file type');
    });
  });
});
