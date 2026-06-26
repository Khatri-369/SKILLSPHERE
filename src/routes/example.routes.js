import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

// Protect ALL routes in this file with verifyJWT (since RBAC requires a authenticated user)
router.use(verifyJWT);

/**
 * Example 1: Admin Only Route
 * GET /api/v1/examples/admin-only
 */
router.get(
  '/admin-only',
  authorizeRoles('Admin'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Welcome Admin! You have accessed the protected admin console.',
      data: {
        user: req.user
      }
    });
  }
);

/**
 * Example 2: Client Only Route
 * GET /api/v1/examples/client-only
 */
router.get(
  '/client-only',
  authorizeRoles('Client'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Welcome Client! You have accessed the client dashboard.',
      data: {
        user: req.user
      }
    });
  }
);

/**
 * Example 3: Freelancer Only Route
 * GET /api/v1/examples/freelancer-only
 */
router.get(
  '/freelancer-only',
  authorizeRoles('Freelancer'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Welcome Freelancer! You have accessed the gig workspace.',
      data: {
        user: req.user
      }
    });
  }
);

/**
 * Example 4: Admin OR Freelancer Shared Route
 * GET /api/v1/examples/shared-dashboard
 */
router.get(
  '/shared-dashboard',
  authorizeRoles('Admin', 'Freelancer'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Welcome Admin or Freelancer! You have accessed the shared management board.',
      data: {
        user: req.user
      }
    });
  }
);

export default router;
