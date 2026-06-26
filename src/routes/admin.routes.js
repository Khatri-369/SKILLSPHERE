import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middleware/auth.middleware.js';
import {
  getAllUsers,
  toggleUserSuspension,
  getAllGigs,
  toggleGigApproval,
  toggleFreelancerVerification,
  getDashboardAnalytics,
} from '../controllers/admin.controller.js';

const router = Router();

// Enforce authentication and Admin role check for all admin routes
router.use(verifyJWT, authorizeRoles('Admin'));

// Users management
router.get('/users', getAllUsers);
router.patch('/users/:userId/suspend', toggleUserSuspension);

// Gigs management
router.get('/gigs', getAllGigs);
router.patch('/gigs/:gigId/approve', toggleGigApproval);

// Freelancers verification
router.patch('/freelancers/:profileId/verify', toggleFreelancerVerification);

// Dashboard Analytics & Charts API
router.get('/analytics', getDashboardAnalytics);

export default router;
