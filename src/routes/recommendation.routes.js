import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middleware/auth.middleware.js';
import { recommendFreelancersForGig } from '../controllers/recommendation.controller.js';

const router = Router();

// Match freelancers to a gig (Client/Admin only)
router.get(
  '/gigs/:gigId/freelancers',
  verifyJWT,
  authorizeRoles('Client', 'Admin'),
  recommendFreelancersForGig
);

export default router;
