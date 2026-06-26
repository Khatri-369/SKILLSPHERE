import { jest } from '@jest/globals';
import request from 'supertest';
import crypto from 'crypto';

// Native ESM Mocking: unstable_mockModule must run BEFORE importing modules that use it
jest.unstable_mockModule('../src/utils/mail.js', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' }),
}));

// Now dynamically import app, models, and helpers
const { default: app } = await import('../src/app.js');
const { default: User } = await import('../src/models/user.model.js');
const { connectTestDB, closeTestDB, clearTestDB, createTestUser } = await import('./setup.js');

describe('Auth APIs', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a user successfully and return 201', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'password123',
          role: 'Client',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Jane Doe');
      expect(res.body.data.email).toBe('jane@example.com');
      expect(res.body.data.role).toBe('Client');
      expect(res.body.data.password).toBeUndefined();

      // Verify user was created in the DB
      const user = await User.findOne({ email: 'jane@example.com' });
      expect(user).toBeTruthy();
      expect(user.isVerified).toBe(false);
    });

    it('should fail registration with validation errors when fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: '',
          email: 'invalid-email',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Name, email, and password are required|Please provide a valid email address/);
    });

    it('should reject registration if the email already exists', async () => {
      await createTestUser('Client', { email: 'duplicate@example.com' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Another User',
          email: 'duplicate@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should authenticate user and return 200 with tokens and cookies', async () => {
      const { user } = await createTestUser('Client', { isVerified: true });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      const cookies = res.headers['set-cookie'].join(' ');
      expect(cookies).toContain('accessToken');
      expect(cookies).toContain('refreshToken');
    });

    it('should reject login if email verification is pending', async () => {
      const { user } = await createTestUser('Client', { isVerified: false });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: 'password123',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('verify your email');
    });

    it('should reject login with wrong credentials', async () => {
      const { user } = await createTestUser('Client', { isVerified: true });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid email or password');
    });
  });

  describe('GET /api/v1/auth/verify-email', () => {
    it('should successfully verify email with a valid token', async () => {
      const { user } = await createTestUser('Client', { isVerified: false });
      
      const verificationToken = user.generateEmailVerificationToken();
      await user.save({ validateBeforeSave: false });

      const res = await request(app)
        .get(`/api/v1/auth/verify-email?token=${verificationToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.isVerified).toBe(true);
      expect(updatedUser.emailVerificationToken).toBeUndefined();
    });

    it('should fail email verification with an expired or invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/verify-email?token=invalidtoken123');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/forgot-password & reset-password', () => {
    it('should process forgot password and reset password lifecycle', async () => {
      const { user } = await createTestUser('Client');
      
      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: user.email });

      expect(forgotRes.status).toBe(200);

      const freshUser = await User.findById(user._id);
      expect(freshUser.forgotPasswordToken).toBeDefined();

      const rawToken = 'dummyToken';
      freshUser.forgotPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      freshUser.forgotPasswordExpiry = Date.now() + 15 * 60 * 1000;
      await freshUser.save();

      const resetRes = await request(app)
        .post(`/api/v1/auth/reset-password?token=${rawToken}`)
        .send({ newPassword: 'newpassword123' });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'newpassword123' });
      
      expect(loginRes.status).toBe(200);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should retrieve current user details if authenticated', async () => {
      const { user, accessToken } = await createTestUser('Client');

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(user._id.toString());
    });

    it('should return 401 if token is not provided', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear cookies on logout', async () => {
      const { accessToken } = await createTestUser('Client');

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const cookies = res.headers['set-cookie'].join(' ');
      expect(cookies).toContain('accessToken=;');
      expect(cookies).toContain('refreshToken=;');
    });
  });
});
