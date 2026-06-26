import { Router } from 'express';
import { searchFreelancers, searchGigs } from '../controllers/search.controller.js';

const router = Router();

// Routes for advanced searching (publicly accessible endpoints)
router.get('/freelancers', searchFreelancers);
router.get('/gigs', searchGigs);

export default router;
