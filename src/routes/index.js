import { Router } from 'express';
import authRouter from './auth.routes.js';
import examplesRouter from './example.routes.js';
import userRouter from './user.routes.js';
import freelancerRouter from './freelancer.routes.js';
import gigRouter from './gig.routes.js';
import searchRouter from './search.routes.js';
import proposalRouter from './proposal.routes.js';
import recommendationRouter from './recommendation.routes.js';
import chatRouter from './chat.routes.js';
import notificationRouter from './notification.routes.js';
import paymentRouter from './payment.routes.js';
import reviewRouter from './review.routes.js';
import adminRouter from './admin.routes.js';
import disputeRouter from './dispute.routes.js';
import analyticsRouter from './analytics.routes.js';

const router = Router();

// Register child routers
router.use('/auth', authRouter);
router.use('/examples', examplesRouter);
router.use('/users', userRouter);
router.use('/freelancers', freelancerRouter);
router.use('/gigs', gigRouter);
router.use('/search', searchRouter);
router.use('/proposals', proposalRouter);
router.use('/recommendations', recommendationRouter);
router.use('/chat', chatRouter);
router.use('/notifications', notificationRouter);
router.use('/payments', paymentRouter);
router.use('/reviews', reviewRouter);
router.use('/admin', adminRouter);
router.use('/disputes', disputeRouter);
router.use('/analytics', analyticsRouter);

export default router;