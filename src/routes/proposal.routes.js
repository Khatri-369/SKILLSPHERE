import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/multer.middleware.js';
import {
  applyToGig,
  updateProposal,
  withdrawProposal,
  getProposalById,
  getMyProposals,
  getProposalsForGig,
  acceptProposal,
  rejectProposal,
  negotiateProposal,
  respondToNegotiation,
} from '../controllers/proposal.controller.js';

const router = Router();

// Enforce JWT validation for all routes
router.use(verifyJWT);

// Exact paths MUST precede wildcard param paths to avoid route conflicts
router.get('/me', authorizeRoles('Freelancer'), getMyProposals);
router.get('/gig/:gigId', authorizeRoles('Client', 'Admin'), getProposalsForGig);

// Proposal application submission
router.post(
  '/',
  authorizeRoles('Freelancer'),
  upload.fields([{ name: 'attachments', maxCount: 3 }]),
  applyToGig
);

// Proposal details lookup
router.get('/:proposalId', getProposalById);

// Proposal updates and withdraw
router.patch(
  '/:proposalId',
  authorizeRoles('Freelancer'),
  upload.fields([{ name: 'attachments', maxCount: 3 }]),
  updateProposal
);
router.patch('/:proposalId/withdraw', authorizeRoles('Freelancer'), withdrawProposal);

// Client review endpoints
router.patch('/:proposalId/accept', authorizeRoles('Client'), acceptProposal);
router.patch('/:proposalId/reject', authorizeRoles('Client'), rejectProposal);
router.patch('/:proposalId/negotiate', authorizeRoles('Client'), negotiateProposal);

// Freelancer response to negotiation counter-offers
router.patch('/:proposalId/negotiate/respond', authorizeRoles('Freelancer'), respondToNegotiation);

export default router;
