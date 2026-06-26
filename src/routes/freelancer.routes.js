import { Router } from 'express';
import {
  createFreelancerProfile,
  getFreelancerProfileMe,
  getFreelancerProfileById,
  updateFreelancerProfile,
  deleteFreelancerProfile,
} from '../controllers/freelancer.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

// Restricted read route (Freelancer only)
router.get('/me', verifyJWT, authorizeRoles('Freelancer'), getFreelancerProfileMe);

// Public route to view freelancer profile by user ID
router.get('/:userId', getFreelancerProfileById);

// Restricted write routes (Freelancer only)
router.use(verifyJWT);
router.use(authorizeRoles('Freelancer'));

router.post('/', createFreelancerProfile);
router.patch('/', updateFreelancerProfile);
router.delete('/', deleteFreelancerProfile);

export default router;
