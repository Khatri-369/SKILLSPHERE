import { Router } from 'express';
import passport from 'passport';
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  googleCallback,
  getCurrentUser,
  verify2FA,
  toggle2FA,
  quickVerifyEmail,
  googleMock,
} from '../controllers/auth.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh-token', refreshAccessToken);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/quick-verify', quickVerifyEmail);
router.post('/verify-2fa', verify2FA);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/' }),
  googleCallback
);
router.get('/google-mock', googleMock);

// Protected routes
router.post('/logout', verifyJWT, logoutUser);
router.get('/me', verifyJWT, getCurrentUser);
router.post('/toggle-2fa', verifyJWT, toggle2FA);

export default router;
