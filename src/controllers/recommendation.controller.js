import Gig from '../models/gig.model.js';
import FreelancerProfile from '../models/freelancerProfile.model.js';
import * as aiService from '../services/ai.service.js';

/**
 * Recommend top 10 freelancers matching a specific Gig's skills
 * GET /api/v1/recommendations/gigs/:gigId/freelancers
 */
export const recommendFreelancersForGig = async (req, res, next) => {
  try {
    const { gigId } = req.params;
    const userId = req.user._id;

    // 1. Fetch the Gig
    const gig = await Gig.findById(gigId);
    if (!gig) {
      const error = new Error('Gig not found');
      error.statusCode = 404;
      return next(error);
    }

    // 2. Validate client ownership
    if (gig.client.toString() !== userId.toString() && req.user.role !== 'Admin') {
      const error = new Error('Access denied. You do not own this gig.');
      error.statusCode = 403;
      return next(error);
    }

    // 3. Fetch all freelancer profiles with owner user populated
    const freelancerProfiles = await FreelancerProfile.find()
      .populate('owner', 'name email avatar bio location');

    // 4. Run AI matching service
    const { recommendations, usedAI } = await aiService.getRecommendedFreelancers(gig, freelancerProfiles);

    return res.status(200).json({
      success: true,
      message: 'Recommended freelancers retrieved successfully',
      data: {
        recommendations,
        usedAI,
      },
    });
  } catch (error) {
    next(error);
  }
};
