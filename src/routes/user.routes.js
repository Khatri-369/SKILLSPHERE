import { Router } from 'express';
import { updateUserProfile } from '../controllers/user.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/multer.middleware.js';

const router = Router();

// Protected profile update path
router.patch(
  '/profile',
  verifyJWT,
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'resume', maxCount: 1 },
  ]),
  updateUserProfile
);

export default router;
