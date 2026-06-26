import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.middleware.js';
import {
  createReview,
  getUserReviews,
  getReviewAnalytics,
} from '../controllers/review.controller.js';

const router = Router();

// Public endpoints
router.get('/user/:userId', getUserReviews);
router.get('/analytics/:userId', getReviewAnalytics);

// Protected endpoints (JWT required)
router.use(verifyJWT);
router.post('/', createReview);

export default router;
