import FreelancerProfile from '../models/freelancerProfile.model.js';
import Gig from '../models/gig.model.js';
import { escapeRegex } from '../utils/security.js';

/**
 * Advanced Search Freelancers
 * GET /api/v1/search/freelancers
 */
export const searchFreelancers = async (req, res, next) => {
  try {
    const {
      location,
      skills,
      minRate,
      maxRate,
      minRating,
      maxRating,
      experience,
      availability,
      search,
      q,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const pipeline = [];

    // 1. Build pre-lookup filter match stage (fields native to FreelancerProfile schema)
    const preMatchStage = {};

    // Filter by skills
    if (skills) {
      const skillList = typeof skills === 'string'
        ? skills.split(',').map((s) => s.trim()).filter(Boolean)
        : Array.isArray(skills) ? skills : [];
      if (skillList.length > 0) {
        preMatchStage.skills = { $in: skillList.map((s) => new RegExp(`^${escapeRegex(s)}$`, 'i')) };
      }
    }

    // Filter by budget/hourlyRate range
    if (minRate !== undefined || maxRate !== undefined) {
      preMatchStage.hourlyRate = {};
      if (minRate !== undefined) preMatchStage.hourlyRate.$gte = Number(minRate);
      if (maxRate !== undefined) preMatchStage.hourlyRate.$lte = Number(maxRate);
    }

    // Filter by rating range
    if (minRating !== undefined || maxRating !== undefined) {
      preMatchStage.rating = {};
      if (minRating !== undefined) preMatchStage.rating.$gte = Number(minRating);
      if (maxRating !== undefined) preMatchStage.rating.$lte = Number(maxRating);
    }

    // Filter by availability
    if (availability) {
      preMatchStage.availability = availability;
    }

    if (Object.keys(preMatchStage).length > 0) {
      pipeline.push({ $match: preMatchStage });
    }

    // 2. Join owner details from users collection (only for documents that pass the pre-lookup filters)
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'ownerDetails',
      },
    });

    // 3. Unwind ownerDetails
    pipeline.push({
      $unwind: '$ownerDetails',
    });

    // 4. Build post-lookup filter match stage (fields belonging to the joined users collection or experience timelines)
    const postMatchStage = {};

    // Filter by location (case-insensitive regex)
    if (location) {
      postMatchStage['ownerDetails.location'] = { $regex: escapeRegex(location), $options: 'i' };
    }

    // Filter by experience details in timeline (case-insensitive title search)
    if (experience) {
      postMatchStage['experienceTimeline.title'] = { $regex: escapeRegex(experience), $options: 'i' };
    }

    // Search query matches name, bio, or skills
    const searchQuery = search || q;
    if (searchQuery) {
      const escapedQuery = escapeRegex(searchQuery);
      postMatchStage.$or = [
        { 'ownerDetails.name': { $regex: escapedQuery, $options: 'i' } },
        { 'ownerDetails.bio': { $regex: escapedQuery, $options: 'i' } },
        { skills: { $regex: escapedQuery, $options: 'i' } },
      ];
    }

    if (Object.keys(postMatchStage).length > 0) {
      pipeline.push({ $match: postMatchStage });
    }

    // 4. Build sorting criteria
    const sortStage = {};
    const validSortFields = ['hourlyRate', 'rating', 'createdAt'];
    const field = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder === 'asc' ? 1 : -1;
    sortStage[field] = order;

    // 5. Facet Stage for parallel count (metadata) & pagination slice (data)
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $sort: sortStage },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              'ownerDetails.password': 0,
              'ownerDetails.refreshToken': 0,
              'ownerDetails.emailVerificationToken': 0,
              'ownerDetails.emailVerificationExpiry': 0,
              'ownerDetails.forgotPasswordToken': 0,
              'ownerDetails.forgotPasswordExpiry': 0,
            },
          },
        ],
      },
    });

    const result = await FreelancerProfile.aggregate(pipeline);

    const total = result[0]?.metadata[0]?.total || 0;
    const freelancers = result[0]?.data || [];

    return res.status(200).json({
      success: true,
      message: 'Freelancers search completed successfully',
      data: {
        freelancers,
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
 * Advanced Search Gigs
 * GET /api/v1/search/gigs
 */
export const searchGigs = async (req, res, next) => {
  try {
    const {
      location,
      skills,
      minBudget,
      maxBudget,
      category,
      status = 'Published',
      search,
      q,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const pipeline = [];

    // 1. Build initial match stage for filtering
    const matchStage = {};

    // Filter by status (default is Published, let clients check drafts or closed)
    if (status) {
      matchStage.status = status;
    }

    // Filter by location
    if (location) {
      matchStage.location = { $regex: escapeRegex(location), $options: 'i' };
    }

    // Filter by budget range
    if (minBudget !== undefined || maxBudget !== undefined) {
      matchStage.budget = {};
      if (minBudget !== undefined) matchStage.budget.$gte = Number(minBudget);
      if (maxBudget !== undefined) matchStage.budget.$lte = Number(maxBudget);
    }

    // Filter by category
    if (category) {
      matchStage.category = { $regex: escapeRegex(category), $options: 'i' };
    }

    // Filter by skills
    if (skills) {
      const skillList = typeof skills === 'string'
        ? skills.split(',').map((s) => s.trim()).filter(Boolean)
        : Array.isArray(skills) ? skills : [];
      if (skillList.length > 0) {
        matchStage.skillsRequired = { $in: skillList.map((s) => new RegExp(`^${escapeRegex(s)}$`, 'i')) };
      }
    }

    // General text search on title, description, category
    const searchQuery = search || q;
    if (searchQuery) {
      const escapedQuery = escapeRegex(searchQuery);
      matchStage.$or = [
        { title: { $regex: escapedQuery, $options: 'i' } },
        { description: { $regex: escapedQuery, $options: 'i' } },
        { category: { $regex: escapedQuery, $options: 'i' } },
      ];
    }

    pipeline.push({ $match: matchStage });

    // 2. Join client user details
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'client',
        foreignField: '_id',
        as: 'clientDetails',
      },
    });

    pipeline.push({
      $unwind: '$clientDetails',
    });

    // 3. Build sorting criteria
    const sortStage = {};
    const validSortFields = ['budget', 'deadline', 'createdAt'];
    const field = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder === 'asc' ? 1 : -1;
    sortStage[field] = order;

    // 4. Facet stage for count and data pagination
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $sort: sortStage },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              'clientDetails.password': 0,
              'clientDetails.refreshToken': 0,
              'clientDetails.emailVerificationToken': 0,
              'clientDetails.emailVerificationExpiry': 0,
              'clientDetails.forgotPasswordToken': 0,
              'clientDetails.forgotPasswordExpiry': 0,
            },
          },
        ],
      },
    });

    const result = await Gig.aggregate(pipeline);

    const total = result[0]?.metadata[0]?.total || 0;
    const gigs = result[0]?.data || [];

    return res.status(200).json({
      success: true,
      message: 'Gigs search completed successfully',
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
