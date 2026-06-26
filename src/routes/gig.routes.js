import { Router } from 'express';
import {
  createGig,
  editGig,
  deleteGig,
  publishGig,
  closeGig,
} from '../controllers/gig.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/multer.middleware.js';

const router = Router();

// Protect all gig routing actions (Clients only)
router.use(verifyJWT);
router.use(authorizeRoles('Client'));

router.post(
  '/',
  upload.fields([{ name: 'attachments', maxCount: 5 }]),
  createGig
);

router.patch(
  '/:gigId',
  upload.fields([{ name: 'attachments', maxCount: 5 }]),
  editGig
);

router.delete('/:gigId', deleteGig);
router.patch('/:gigId/publish', publishGig);
router.patch('/:gigId/close', closeGig);

export default router;
