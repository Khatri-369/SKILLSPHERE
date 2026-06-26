import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middleware/auth.middleware.js';
import {
  getClientAnalytics,
  getFreelancerAnalytics,
} from '../controllers/analytics.controller.js';

const router = Router();

// Enforce authentication for all analytics routes
router.use(verifyJWT);

// Client-only analytics
router.get('/client', authorizeRoles('Client'), getClientAnalytics);

// Freelancer-only analytics
router.get('/freelancer', authorizeRoles('Freelancer'), getFreelancerAnalytics);

export default router;
