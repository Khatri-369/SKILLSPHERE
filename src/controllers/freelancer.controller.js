import FreelancerProfile from '../models/freelancerProfile.model.js';
import User from '../models/user.model.js';

/**
 * Create Freelancer Profile
 * POST /api/v1/freelancers/profile
 */
export const createFreelancerProfile = async (req, res, next) => {
  try {
    const ownerId = req.user._id;

    // 1. Double check if profile already exists
    const existingProfile = await FreelancerProfile.findOne({ owner: ownerId });
    if (existingProfile) {
      const error = new Error('Freelancer profile already exists for this user');
      error.statusCode = 400;
      return next(error);
    }

    const {
      skills,
      skillLevel,
      hourlyRate,
      certificates,
      portfolio,
      availability,
      languages,
      experienceTimeline,
    } = req.body;

    // 2. Build profile object (explicitly ignoring verificationBadge)
    const newProfile = await FreelancerProfile.create({
      owner: ownerId,
      skills: Array.isArray(skills) ? skills : [],
      skillLevel: skillLevel || 'Intermediate',
      hourlyRate: hourlyRate || 0,
      certificates: Array.isArray(certificates) ? certificates : [],
      portfolio: Array.isArray(portfolio) ? portfolio : [],
      availability: availability || 'Available',
      languages: Array.isArray(languages) ? languages : [],
      experienceTimeline: Array.isArray(experienceTimeline) ? experienceTimeline : [],
      verificationBadge: false, // Default is false, cannot be self-set
    });

    const populatedProfile = await FreelancerProfile.findById(newProfile._id).populate('owner', 'name email role');

    return res.status(201).json({
      success: true,
      message: 'Freelancer profile created successfully',
      data: populatedProfile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current freelancer's own profile
 * GET /api/v1/freelancers/profile/me
 */
export const getFreelancerProfileMe = async (req, res, next) => {
  try {
    const ownerId = req.user._id;

    const profile = await FreelancerProfile.findOne({ owner: ownerId }).populate('owner', 'name email role');
    if (!profile) {
      const error = new Error('Freelancer profile not found');
      error.statusCode = 404;
      return next(error);
    }

    return res.status(200).json({
      success: true,
      message: 'Freelancer profile retrieved successfully',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get freelancer profile publicly by owner userId
 * GET /api/v1/freelancers/profile/:userId
 */
export const getFreelancerProfileById = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const profile = await FreelancerProfile.findOne({ owner: userId }).populate('owner', 'name email role');
    if (!profile) {
      const error = new Error('Freelancer profile not found');
      error.statusCode = 404;
      return next(error);
    }

    // Increment profile views
    profile.profileViews = (profile.profileViews || 0) + 1;
    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Public freelancer profile retrieved successfully',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Freelancer Profile
 * PATCH /api/v1/freelancers/profile
 */
export const updateFreelancerProfile = async (req, res, next) => {
  try {
    const ownerId = req.user._id;

    // 1. Find profile
    const profile = await FreelancerProfile.findOne({ owner: ownerId });
    if (!profile) {
      const error = new Error('Freelancer profile not found');
      error.statusCode = 404;
      return next(error);
    }

    // 2. Fields allowed to be updated by the freelancer (verificationBadge is strictly excluded)
    const allowedFields = [
      'skills',
      'skillLevel',
      'hourlyRate',
      'certificates',
      'portfolio',
      'availability',
      'languages',
      'experienceTimeline',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        profile[field] = req.body[field];
      }
    });

    // 3. Save updates
    await profile.save();

    const updatedProfile = await FreelancerProfile.findById(profile._id).populate('owner', 'name email role');

    return res.status(200).json({
      success: true,
      message: 'Freelancer profile updated successfully',
      data: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Freelancer Profile
 * DELETE /api/v1/freelancers/profile
 */
export const deleteFreelancerProfile = async (req, res, next) => {
  try {
    const ownerId = req.user._id;

    const profile = await FreelancerProfile.findOneAndDelete({ owner: ownerId });
    if (!profile) {
      const error = new Error('Freelancer profile not found');
      error.statusCode = 404;
      return next(error);
    }

    return res.status(200).json({
      success: true,
      message: 'Freelancer profile deleted successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
