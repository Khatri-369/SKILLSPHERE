import Gig from '../models/gig.model.js';
import Proposal from '../models/proposal.model.js';
import Payment from '../models/payment.model.js';
import FreelancerProfile from '../models/freelancerProfile.model.js';
import cacheService from '../services/cache.service.js';
import mongoose from 'mongoose';

/**
 * Get Client specific analytics
 * GET /api/v1/analytics/client
 */
export const getClientAnalytics = async (req, res, next) => {
  try {
    const clientId = req.user._id;
    const cacheKey = `analytics:client:${clientId}`;
    
    // Attempt cache hit
    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        success: true,
        message: 'Client analytics retrieved successfully',
        data: cachedData,
      });
    }

    // 1. Gigs Published count
    const gigsPublished = await Gig.countDocuments({ client: clientId });

    // 2. Active Gigs count (status: Published)
    const activeGigs = await Gig.countDocuments({ client: clientId, status: 'Published' });

    // 3. Total Spend (sum of Paid payments sent by this client)
    const spendResult = await Payment.aggregate([
      { $match: { sender: clientId, status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalSpend = spendResult.length > 0 ? spendResult[0].total : 0;

    // 4. Proposals Received count - using lean for optimization
    const clientGigs = await Gig.find({ client: clientId }).select('_id').lean();
    const clientGigIds = clientGigs.map((g) => g._id);
    const proposalsReceived = await Proposal.countDocuments({ gig: { $in: clientGigIds } });

    const analyticsData = {
      gigsPublished,
      activeGigs,
      totalSpend: Math.round(totalSpend * 100) / 100,
      proposalsReceived,
    };

    // Cache the query result for 5 minutes
    cacheService.set(cacheKey, analyticsData, 300);

    return res.status(200).json({
      success: true,
      message: 'Client analytics retrieved successfully',
      data: analyticsData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Freelancer specific analytics (with monthly earnings timeline for charting)
 * GET /api/v1/analytics/freelancer
 */
export const getFreelancerAnalytics = async (req, res, next) => {
  try {
    const freelancerId = req.user._id;
    const cacheKey = `analytics:freelancer:${freelancerId}`;

    // Attempt cache hit
    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        success: true,
        message: 'Freelancer analytics retrieved successfully',
        data: cachedData,
      });
    }

    // 1. Gigs Completed/Active (proposals accepted count)
    const gigsCompleted = await Proposal.countDocuments({
      freelancer: freelancerId,
      status: 'Accepted',
    });

    // 2. Profile Views count - using lean
    const profile = await FreelancerProfile.findOne({ owner: freelancerId }).select('profileViews').lean();
    const profileViews = profile ? profile.profileViews : 0;

    // 3. Applications status distribution count
    const proposalStats = await Proposal.aggregate([
      { $match: { freelancer: freelancerId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const applications = {
      Pending: 0,
      Accepted: 0,
      Rejected: 0,
      Withdrawn: 0,
      Negotiating: 0,
    };

    proposalStats.forEach((stat) => {
      if (applications[stat._id] !== undefined) {
        applications[stat._id] = stat.count;
      }
    });

    // 4. Revenue Graph (timeline of monthly earnings for the last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyEarningsAgg = await Payment.aggregate([
      {
        $match: {
          recipient: freelancerId,
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

    const revenueGraph = timelineTemplate.map((t) => {
      const dbMatch = monthlyEarningsAgg.find(
        (agg) => agg._id.year === t.year && agg._id.month === t.monthIndex + 1
      );
      return {
        month: t.label,
        earnings: dbMatch ? Math.round(dbMatch.amount * 100) / 100 : 0,
      };
    });

    const analyticsData = {
      gigsCompleted,
      profileViews,
      applications,
      revenueGraph,
    };

    // Cache the query result for 5 minutes
    cacheService.set(cacheKey, analyticsData, 300);

    return res.status(200).json({
      success: true,
      message: 'Freelancer analytics retrieved successfully',
      data: analyticsData,
    });
  } catch (error) {
    next(error);
  }
};
