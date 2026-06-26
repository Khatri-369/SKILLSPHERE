import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/multer.middleware.js';
import {
  raiseDispute,
  getMyDisputes,
  getDisputeById,
  adminResolveDispute,
  closeOwnDispute,
  adminGetAllDisputes,
} from '../controllers/dispute.controller.js';

const router = Router();

// Enforce authentication for all dispute routes
router.use(verifyJWT);

// Exact paths MUST precede wildcard parameter paths to avoid conflicts
router.get('/me', getMyDisputes);

// Admin-only endpoints
router.get('/', authorizeRoles('Admin'), adminGetAllDisputes);
router.patch('/:disputeId/resolve', authorizeRoles('Admin'), adminResolveDispute);

// General Dispute access routes
router.post('/', upload.fields([{ name: 'evidence', maxCount: 3 }]), raiseDispute);
router.get('/:disputeId', getDisputeById);
router.patch('/:disputeId/close', closeOwnDispute);

export default router;
