import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middleware/auth.middleware.js';
import {
  createMilestoneOrder,
  verifyPaymentSignature,
  refundPayment,
  getPaymentHistory,
  handleWebhook,
} from '../controllers/payment.controller.js';

const router = Router();

// 1. PUBLIC Webhook Endpoint (No JWT, signature verified dynamically using HMAC SHA256)
router.post('/webhook', handleWebhook);

// Enforce JWT validation for all remaining routes
router.use(verifyJWT);

// 2. EXACT Paths (Must precede wildcard/param routes to avoid cast conflicts)
router.post('/order', authorizeRoles('Client'), createMilestoneOrder);
router.post('/verify', verifyPaymentSignature);
router.get('/history', getPaymentHistory);

// 3. PARAMETER/WILDCARD Paths
router.post('/:paymentId/refund', authorizeRoles('Client', 'Admin'), refundPayment);

export default router;
