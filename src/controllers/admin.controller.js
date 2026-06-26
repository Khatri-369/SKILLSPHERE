import User from '../models/user.model.js';
import Gig from '../models/gig.model.js';
import FreelancerProfile from '../models/freelancerProfile.model.js';
import Payment from '../models/payment.model.js';
import mongoose from 'mongoose';
import { escapeRegex } from '../utils/security.js';
import cacheService from '../services/cache.service.js';


/**
 * Get all users list with pagination, search, and role/suspension filtering
 * GET /api/v1/admin/users
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const skip = (page - 1) * limit;
    const { search, role, isSuspended } = req.query;

    const query = {};

    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    if (role) {
      query.role = role;
    }

    if (isSuspended !== undefined) {
      query.isSuspended = isSuspended === 'true';
    }

    const users = await User.find(query)
      .select('-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: 'Users list retrieved successfully',
      data: {
        users,
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
 * Toggle suspension status of a User
 * PATCH /api/v1/admin/users/:userId/suspend
 */
export const toggleUserSuspension = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isSuspended } = req.body;

    if (isSuspended === undefined) {
      const error = new Error('isSuspended boolean flag is required in body');
      error.statusCode = 400;
      return next(error);
    }

    // Protect from suspending oneself
    if (userId.toString() === req.user._id.toString()) {
      const error = new Error('You cannot suspend your own admin account');
      error.statusCode = 400;
      return next(error);
    }

    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    user.isSuspended = !!isSuspended;
    await user.save();

    const updatedUser = await User.findById(userId).select('-password -refreshToken');

    return res.status(200).json({
      success: true,
      message: `User account has been successfully ${user.isSuspended ? 'suspended' : 'unsuspended'}`,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Gigs list with pagination, search, category, and approval filters
 * GET /api/v1/admin/gigs
 */
export const getAllGigs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const skip = (page - 1) * limit;
    const { search, category, status, isApproved } = req.query;

    const query = {};

    if (search) {
      query.title = { $regex: escapeRegex(search), $options: 'i' };
    }

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (isApproved !== undefined) {
      query.isApproved = isApproved === 'true';
    }

    const gigs = await Gig.find(query)
      .populate('client', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Gig.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: 'Gigs list retrieved successfully',
      data: {
        gigs,
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
 * Toggle approval status of a Gig
 * PATCH /api/v1/admin/gigs/:gigId/approve
 */
export const toggleGigApproval = async (req, res, next) => {
  try {
    const { gigId } = req.params;
    const { isApproved } = req.body;

    if (isApproved === undefined) {
      const error = new Error('isApproved boolean flag is required in body');
      error.statusCode = 400;
      return next(error);
    }

    const gig = await Gig.findById(gigId);
    if (!gig) {
      const error = new Error('Gig not found');
      error.statusCode = 404;
      return next(error);
    }

    gig.isApproved = !!isApproved;
    await gig.save();

    const populatedGig = await Gig.findById(gigId).populate('client', 'name email');

    return res.status(200).json({
      success: true,
      message: `Gig approval status set to: ${gig.isApproved}`,
      data: populatedGig,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle verification badge status of a Freelancer Profile
 * PATCH /api/v1/admin/freelancers/:profileId/verify
 */
export const toggleFreelancerVerification = async (req, res, next) => {
  try {
    const { profileId } = req.params;
    const { verificationBadge } = req.body;

    if (verificationBadge === undefined) {
      const error = new Error('verificationBadge boolean flag is required in body');
      error.statusCode = 400;
      return next(error);
    }

    const profile = await FreelancerProfile.findById(profileId);
    if (!profile) {
      const error = new Error('Freelancer profile not found');
      error.statusCode = 404;
      return next(error);
    }

    profile.verificationBadge = !!verificationBadge;
    await profile.save();

    const populatedProfile = await FreelancerProfile.findById(profileId).populate('owner', 'name email');

    return res.status(200).json({
      success: true,
      message: `Freelancer profile verification status set to: ${profile.verificationBadge}`,
      data: populatedProfile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get core Admin Dashboard and Charts analytics (revenue, monthly timelines, etc.)
 * GET /api/v1/admin/analytics
 */
export const getDashboardAnalytics = async (req, res, next) => {
  try {
    const cacheKey = 'admin:analytics';
    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        success: true,
        message: 'Dashboard analytics retrieved successfully',
        data: cachedData,
      });
    }

    // 1. Total Revenue
    const revenueResult = await Payment.aggregate([
      { $match: { status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // 2. Total active (unsuspended) freelancers
    const activeFreelancersCount = await User.countDocuments({
      role: 'Freelancer',
      isSuspended: false,
    });

    // 3. Last 6 months timeline parameters
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const timelineTemplate = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      timelineTemplate.push({
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
      });
    }

    // 4. Revenue Timeline aggregate
    const revenueTimelineAgg = await Payment.aggregate([
      {
        $match: {
          status: 'Paid',
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          amount: { $sum: '$amount' },
        },
      },
    ]);

    const revenueTimeline = timelineTemplate.map((t) => {
      const dbMatch = revenueTimelineAgg.find(
        (agg) => agg._id.year === t.year && agg._id.month === t.monthIndex + 1
      );
      return {
        month: t.label,
        revenue: dbMatch ? Math.round(dbMatch.amount * 100) / 100 : 0,
      };
    });

    // 5. Monthly Users timeline aggregate
    const userTimelineAgg = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const monthlyUsers = timelineTemplate.map((t) => {
      const dbMatch = userTimelineAgg.find(
        (agg) => agg._id.year === t.year && agg._id.month === t.monthIndex + 1
      );
      return {
        month: t.label,
        count: dbMatch ? dbMatch.count : 0,
      };
    });

    // 6. Top Categories count aggregate
    const categoryAgg = await Gig.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const topCategories = categoryAgg.map((c) => ({
      category: c._id || 'Uncategorized',
      count: c.count,
    }));

    const analyticsData = {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      activeFreelancers: activeFreelancersCount,
      revenueTimeline,
      monthlyUsers,
      topCategories,
    };

    cacheService.set(cacheKey, analyticsData, 300); // 5 minutes cache

    return res.status(200).json({
      success: true,
      message: 'Dashboard analytics retrieved successfully',
      data: analyticsData,
    });
  } catch (error) {
    next(error);
  }
};
