import Review from '../models/review.model.js';
import Gig from '../models/gig.model.js';
import Proposal from '../models/proposal.model.js';
import mongoose from 'mongoose';

/**
 * Submit a Review (Verified Connection required, single review per gig constraint)
 * POST /api/v1/reviews
 */
export const createReview = async (req, res, next) => {
  try {
    const { gigId, reviewedUserId, rating, comment } = req.body;
    const reviewerId = req.user._id;

    // 1. Validation
    if (!gigId || !reviewedUserId || rating === undefined) {
      const error = new Error('Gig ID, reviewed user ID, and rating are required');
      error.statusCode = 400;
      return next(error);
    }

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5 || !Number.isInteger(numericRating)) {
      const error = new Error('Rating must be an integer between 1 and 5');
      error.statusCode = 400;
      return next(error);
    }

    // 2. Prevent Self-Review
    if (reviewerId.toString() === reviewedUserId.toString()) {
      const error = new Error('You cannot review yourself');
      error.statusCode = 400;
      return next(error);
    }

    // 3. Verify Gig exists
    const gig = await Gig.findById(gigId);
    if (!gig) {
      const error = new Error('Gig not found');
      error.statusCode = 404;
      return next(error);
    }

    // 4. Verify connection/hire exists:
    // Reviewer must be Client and ReviewedUser must be Freelancer, OR
    // Reviewer must be Freelancer and ReviewedUser must be Client.
    const isClientReviewingFreelancer =
      gig.client.toString() === reviewerId.toString();
    const isFreelancerReviewingClient =
      gig.client.toString() === reviewedUserId.toString();

    let freelancerId;
    if (isClientReviewingFreelancer) {
      freelancerId = reviewedUserId;
    } else if (isFreelancerReviewingClient) {
      freelancerId = reviewerId;
    } else {
      const error = new Error('You are not authorized to submit a review for this gig relationship.');
      error.statusCode = 403;
      return next(error);
    }

    // Find the accepted proposal for this gig and freelancer
    const proposal = await Proposal.findOne({
      gig: gigId,
      freelancer: freelancerId,
      status: 'Accepted',
    });

    if (!proposal) {
      const error = new Error('Verified review check failed. No accepted proposal found for this freelancer on the gig.');
      error.statusCode = 403;
      return next(error);
    }

    // 5. Prevent Duplicate Reviews
    const existingReview = await Review.findOne({
      gig: gigId,
      reviewer: reviewerId,
    });

    if (existingReview) {
      const error = new Error('You have already submitted a review for this gig.');
      error.statusCode = 400;
      return next(error);
    }

    // 6. Create Review
    const review = await Review.create({
      reviewer: reviewerId,
      reviewedUser: reviewedUserId,
      gig: gigId,
      rating: numericRating,
      comment: comment || '',
      isVerified: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Reviews history for a specific User
 * GET /api/v1/reviews/user/:userId
 */
export const getUserReviews = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ reviewedUser: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reviewer', 'name email avatar')
      .populate('gig', 'title category budget');

    const total = await Review.countDocuments({ reviewedUser: userId });

    return res.status(200).json({
      success: true,
      message: 'User reviews retrieved successfully',
      data: {
        reviews,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Review Analytics for a specific User
 * GET /api/v1/reviews/analytics/:userId
 */
export const getReviewAnalytics = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const stats = await Review.aggregate([
      { $match: { reviewedUser: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const distributionStats = await Review.aggregate([
      { $match: { reviewedUser: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ]);

    // Format distribution stats
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distributionStats.forEach((stat) => {
      if (ratingDistribution[stat._id] !== undefined) {
        ratingDistribution[stat._id] = stat.count;
      }
    });

    const averageRating = stats.length > 0 ? Math.round(stats[0].averageRating * 10) / 10 : 0;
    const totalReviews = stats.length > 0 ? stats[0].totalReviews : 0;

    return res.status(200).json({
      success: true,
      message: 'Review analytics retrieved successfully',
      data: {
        averageRating,
        totalReviews,
        ratingDistribution,
      },
    });
  } catch (error) {
    next(error);
  }
};
