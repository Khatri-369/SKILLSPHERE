import request from 'supertest';
import app from '../src/app.js';
import Gig from '../src/models/gig.model.js';
import Proposal from '../src/models/proposal.model.js';
import Dispute from '../src/models/dispute.model.js';
import { connectTestDB, closeTestDB, clearTestDB, createTestUser } from './setup.js';

describe('Dispute APIs', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('Dispute Lifecycle', () => {
    it('should raise, retrieve, close, and resolve disputes successfully', async () => {
      const { user: client, accessToken: clientToken } = await createTestUser('Client');
      const { user: freelancer, accessToken: freelancerToken } = await createTestUser('Freelancer');
      const { accessToken: adminToken } = await createTestUser('Admin');

      // 1. Create Gig
      const gig = await Gig.create({
        client: client._id,
        title: 'Dispute Gig Test',
        description: 'Testing disputes',
        budget: 500,
        category: 'Development',
        deadline: new Date('2026-12-31'),
        status: 'Published',
      });

      // 2. Create Proposal & Accept (so they are contractually connected)
      const proposal = await Proposal.create({
        gig: gig._id,
        freelancer: freelancer._id,
        bidAmount: 500,
        estimatedTime: '5 days',
        description: 'Proposal desc',
        status: 'Accepted',
      });

      // 3. Client raises a dispute (Expect 201)
      const raiseRes = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          gigId: gig._id,
          title: 'Work delay',
          description: 'The freelancer is late',
        });

      expect(raiseRes.status).toBe(201);
      expect(raiseRes.body.success).toBe(true);
      const disputeId = raiseRes.body.data._id;

      // 4. Try raising duplicate dispute (Expect 400)
      const dupRes = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          gigId: gig._id,
          title: 'Another dispute',
          description: 'Duplicate attempt',
        });

      expect(dupRes.status).toBe(400);
      expect(dupRes.body.message).toContain('already exists for this gig');

      // 5. Get own disputes (Expect 200)
      const meRes = await request(app)
        .get('/api/v1/disputes/me')
        .set('Authorization', `Bearer ${freelancerToken}`); // Freelancer is the recipient

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.disputes.length).toBe(1);

      // 6. Close the dispute by Client owner (Expect 200)
      const closeRes = await request(app)
        .patch(`/api/v1/disputes/${disputeId}/close`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(closeRes.status).toBe(200);
      expect(closeRes.body.data.status).toBe('Closed');

      // 7. Client raises a second dispute to test Admin Resolution
      const secondRaiseRes = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          gigId: gig._id,
          title: 'Quality issue',
          description: 'Substandard work delivered',
        });

      const secondDisputeId = secondRaiseRes.body.data._id;

      // 8. Admin resolves dispute (Expect 200)
      const resolveRes = await request(app)
        .patch(`/api/v1/disputes/${secondDisputeId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Resolved',
          resolutionNotes: 'Refund issued to client.',
        });

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.data.status).toBe('Resolved');
      expect(resolveRes.body.data.resolutionNotes).toBe('Refund issued to client.');
    });

    it('should reject raising a dispute if users are not contractually connected', async () => {
      const { user: client, accessToken: clientToken } = await createTestUser('Client');
      const { user: otherClient } = await createTestUser('Client');

      const gig = await Gig.create({
        client: otherClient._id,
        title: 'Gig belonging to someone else',
        description: 'Test descriptions',
        budget: 500,
        category: 'Development',
        deadline: new Date('2026-12-31'),
        status: 'Published',
      });

      const res = await request(app)
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          gigId: gig._id,
          title: 'Fake dispute',
          description: 'No contract exists',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('No active hired freelancer found');
    });
  });
});
