import request from 'supertest';
import app from '../src/app.js';
import mongoose from 'mongoose';
import Gig from '../src/models/gig.model.js';
import Payment from '../src/models/payment.model.js';
import { connectTestDB, closeTestDB, clearTestDB, createTestUser } from './setup.js';

describe('Payment APIs', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('POST /api/v1/payments/order', () => {
    it('should create a pending payment order successfully', async () => {
      const { user: client, accessToken } = await createTestUser('Client');
      const { user: freelancer } = await createTestUser('Freelancer');

      const gig = await Gig.create({
        client: client._id,
        title: 'Gig with milestones',
        description: 'Testing milestones',
        budget: 1000,
        category: 'Development',
        deadline: new Date('2026-12-31'),
        milestones: [
          { title: 'Milestone 1', description: 'Description 1', amount: 400 },
        ],
      });

      const milestoneId = gig.milestones[0]._id;

      const res = await request(app)
        .post('/api/v1/payments/order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          gigId: gig._id,
          milestoneId,
          recipientId: freelancer._id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Pending');
      expect(res.body.data.amount).toBe(400);

      // Verify payment was recorded in the database
      const dbPayment = await Payment.findOne({ gig: gig._id, milestoneId });
      expect(dbPayment).toBeTruthy();
      expect(dbPayment.status).toBe('Pending');
    });

    it('should prevent creating a payment order for a milestone that is already paid', async () => {
      const { user: client, accessToken } = await createTestUser('Client');
      const { user: freelancer } = await createTestUser('Freelancer');

      const gig = await Gig.create({
        client: client._id,
        title: 'Gig with paid milestone',
        description: 'Testing paid milestone',
        budget: 1000,
        category: 'Development',
        deadline: new Date('2026-12-31'),
        milestones: [
          { title: 'Paid Milestone', description: 'Desc', amount: 500 },
        ],
      });

      const milestoneId = gig.milestones[0]._id;

      // Seed a payment with 'Paid' status in the DB
      await Payment.create({
        sender: client._id,
        recipient: freelancer._id,
        gig: gig._id,
        milestoneId,
        amount: 500,
        currency: 'INR',
        razorpayOrderId: 'order_123',
        status: 'Paid',
      });

      const res = await request(app)
        .post('/api/v1/payments/order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          gigId: gig._id,
          milestoneId,
          recipientId: freelancer._id,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already paid');
    });
  });

  describe('POST /api/v1/payments/verify', () => {
    it('should verify payment signature successfully', async () => {
      const { user: client, accessToken } = await createTestUser('Client');
      const { user: freelancer } = await createTestUser('Freelancer');
      const dummyGigId = new mongoose.Types.ObjectId();
      const dummyMilestoneId = new mongoose.Types.ObjectId();

      const payment = await Payment.create({
        sender: client._id,
        recipient: freelancer._id,
        gig: dummyGigId,
        milestoneId: dummyMilestoneId,
        amount: 100,
        currency: 'INR',
        razorpayOrderId: 'order_test_123',
        status: 'Pending',
      });

      const res = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          razorpayOrderId: 'order_test_123',
          razorpayPaymentId: 'pay_test_456',
          razorpaySignature: 'sig_test_789',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbPayment = await Payment.findById(payment._id);
      expect(dbPayment.status).toBe('Paid');
      expect(dbPayment.razorpayPaymentId).toBe('pay_test_456');
    });
  });

  describe('POST /api/v1/payments/:paymentId/refund', () => {
    it('should refund a paid milestone payment successfully', async () => {
      const { user: client, accessToken } = await createTestUser('Client');
      const { user: freelancer } = await createTestUser('Freelancer');
      const dummyGigId = new mongoose.Types.ObjectId();
      const dummyMilestoneId = new mongoose.Types.ObjectId();

      const payment = await Payment.create({
        sender: client._id,
        recipient: freelancer._id,
        gig: dummyGigId,
        milestoneId: dummyMilestoneId,
        amount: 300,
        currency: 'INR',
        razorpayOrderId: 'order_refund_test',
        razorpayPaymentId: 'pay_refund_test',
        status: 'Paid',
      });

      const res = await request(app)
        .post(`/api/v1/payments/${payment._id}/refund`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          reason: 'Work was canceled by agreement',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Refunded');

      const dbPayment = await Payment.findById(payment._id);
      expect(dbPayment.status).toBe('Refunded');
    });
  });

  describe('POST /api/v1/payments/webhook', () => {
    it('should process payment.captured webhook event', async () => {
      const { user: client } = await createTestUser('Client');
      const { user: freelancer } = await createTestUser('Freelancer');
      const dummyGigId = new mongoose.Types.ObjectId();
      const dummyMilestoneId = new mongoose.Types.ObjectId();

      const payment = await Payment.create({
        sender: client._id,
        recipient: freelancer._id,
        gig: dummyGigId,
        milestoneId: dummyMilestoneId,
        amount: 250,
        currency: 'INR',
        razorpayOrderId: 'order_webhook_123',
        status: 'Pending',
      });

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .send({
          event: 'payment.captured',
          payload: {
            payment: {
              entity: {
                order_id: 'order_webhook_123',
                id: 'pay_webhook_456',
              },
            },
          },
        });

      expect(res.status).toBe(200);
      expect(res.text).toContain('Webhook completed successfully');

      const dbPayment = await Payment.findById(payment._id);
      expect(dbPayment.status).toBe('Paid');
      expect(dbPayment.razorpayPaymentId).toBe('pay_webhook_456');
    });
  });
});
