import request from 'supertest';
import app from '../src/app.js';
import Notification from '../src/models/notification.model.js';
import { connectTestDB, closeTestDB, clearTestDB, createTestUser } from './setup.js';

describe('Notification APIs', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('GET /api/v1/notifications', () => {
    it('should retrieve notifications for the logged in user', async () => {
      const { user, accessToken } = await createTestUser('Client');

      // Seed a notification in DB with valid enum type
      await Notification.create({
        recipient: user._id,
        title: 'New Proposal',
        message: 'A freelancer submitted a proposal on your gig.',
        type: 'ProposalSubmitted',
      });

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications.length).toBe(1);
      expect(res.body.data.notifications[0].title).toBe('New Proposal');
    });
  });

  describe('GET /api/v1/notifications/unread-count', () => {
    it('should return correct unread count', async () => {
      const { user, accessToken } = await createTestUser('Client');

      await Notification.create({
        recipient: user._id,
        title: 'Notification 1',
        message: 'Message 1',
        isRead: false,
        type: 'System',
      });

      await Notification.create({
        recipient: user._id,
        title: 'Notification 2',
        message: 'Message 2',
        isRead: true,
        type: 'System',
      });

      const res = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unreadCount).toBe(1);
    });
  });

  describe('PATCH /api/v1/notifications/:notificationId/read', () => {
    it('should mark a specific notification as read', async () => {
      const { user, accessToken } = await createTestUser('Client');
      const notification = await Notification.create({
        recipient: user._id,
        title: 'Unread Alert',
        message: 'Read me',
        isRead: false,
        type: 'System',
      });

      const res = await request(app)
        .patch(`/api/v1/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isRead).toBe(true);

      const dbNotification = await Notification.findById(notification._id);
      expect(dbNotification.isRead).toBe(true);
    });
  });

  describe('PATCH /api/v1/notifications/read-all', () => {
    it('should mark all notifications of the user as read', async () => {
      const { user, accessToken } = await createTestUser('Client');
      await Notification.create({
        recipient: user._id,
        title: 'Alert 1',
        message: 'Msg 1',
        isRead: false,
        type: 'System',
      });
      await Notification.create({
        recipient: user._id,
        title: 'Alert 2',
        message: 'Msg 2',
        isRead: false,
        type: 'System',
      });

      const res = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const unreadCount = await Notification.countDocuments({ recipient: user._id, isRead: false });
      expect(unreadCount).toBe(0);
    });
  });

  describe('POST /api/v1/notifications', () => {
    it('should allow triggering a custom system notification', async () => {
      const { user, accessToken } = await createTestUser('Client');

      const res = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          recipientId: user._id,
          title: 'Custom Alert',
          message: 'System generated alert.',
          type: 'System',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Custom Alert');

      const notification = await Notification.findOne({ recipient: user._id, title: 'Custom Alert' });
      expect(notification).toBeTruthy();
    });
  });
});
