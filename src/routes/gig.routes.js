import { Router } from 'express';
import {
  createGig,
  editGig,
  deleteGig,
  publishGig,
  closeGig,
  getMyGigs,
  submitMilestone,
  approveMilestone,
} from '../controllers/gig.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/multer.middleware.js';

const router = Router();

// Protect all gig routing actions
router.use(verifyJWT);

// Client-only routes
router.get('/me', authorizeRoles('Client'), getMyGigs);

router.post(
  '/',
  authorizeRoles('Client'),
  upload.fields([{ name: 'attachments', maxCount: 5 }]),
  createGig
);

router.patch(
  '/:gigId',
  authorizeRoles('Client'),
  upload.fields([{ name: 'attachments', maxCount: 5 }]),
  editGig
);

router.delete('/:gigId', authorizeRoles('Client'), deleteGig);
router.patch('/:gigId/publish', authorizeRoles('Client'), publishGig);
router.patch('/:gigId/close', authorizeRoles('Client'), closeGig);

// Progress tracker routes
router.patch('/:gigId/milestones/:milestoneId/submit', authorizeRoles('Freelancer'), submitMilestone);
router.patch('/:gigId/milestones/:milestoneId/approve', authorizeRoles('Client'), approveMilestone);

export default router;
