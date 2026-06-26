import Gig from '../models/gig.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

/**
 * Create a new Gig
 * POST /api/v1/gigs
 */
export const createGig = async (req, res, next) => {
  try {
    const { title, description, budget, category, location, deadline, status } = req.body;
    const clientId = req.user._id;

    // 1. Validation check for required fields
    if (!title || !description || !budget || !category || !deadline) {
      const error = new Error('Title, description, budget, category, and deadline are required');
      error.statusCode = 400;
      return next(error);
    }

    if (budget < 0) {
      const error = new Error('Budget cannot be negative');
      error.statusCode = 400;
      return next(error);
    }

    // 2. Parse skillsRequired array
    let parsedSkills = [];
    if (req.body.skillsRequired !== undefined) {
      const skillsInput = req.body.skillsRequired;
      if (typeof skillsInput === 'string') {
        try {
          parsedSkills = JSON.parse(skillsInput);
        } catch (e) {
          parsedSkills = skillsInput.split(',').map((s) => s.trim()).filter(Boolean);
        }
      } else if (Array.isArray(skillsInput)) {
        parsedSkills = skillsInput;
      }
    }

    // 3. Parse milestones array
    let parsedMilestones = [];
    if (req.body.milestones !== undefined) {
      const milestonesInput = req.body.milestones;
      try {
        parsedMilestones = typeof milestonesInput === 'string' ? JSON.parse(milestonesInput) : milestonesInput;
      } catch (e) {
        const error = new Error('Invalid milestones format. Must be a valid JSON array.');
        error.statusCode = 400;
        return next(error);
      }
    }

    // 4. Handle attachments array uploads
    const attachmentUrls = [];
    if (req.files?.attachments) {
      const files = req.files.attachments;
      for (const file of files) {
        const cloudinaryResponse = await uploadToCloudinary(file.path);
        if (cloudinaryResponse?.secure_url) {
          attachmentUrls.push(cloudinaryResponse.secure_url);
        }
      }
    }

    // 5. Create gig
    const gig = await Gig.create({
      client: clientId,
      title,
      description,
      budget,
      category,
      location: location || 'Remote',
      deadline: new Date(deadline),
      skillsRequired: parsedSkills,
      milestones: parsedMilestones,
      attachments: attachmentUrls,
      status: status || 'Draft',
    });

    const populatedGig = await Gig.findById(gig._id).populate('client', 'name email role');

    return res.status(201).json({
      success: true,
      message: 'Gig created successfully',
      data: populatedGig,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Edit a Gig
 * PATCH /api/v1/gigs/:gigId
 */
export const editGig = async (req, res, next) => {
  try {
    const { gigId } = req.params;
    const clientId = req.user._id;

    // 1. Query gig
    const gig = await Gig.findById(gigId);
    if (!gig) {
      const error = new Error('Gig not found');
      error.statusCode = 404;
      return next(error);
    }

    // 2. Validate ownership
    if (gig.client.toString() !== clientId.toString()) {
      const error = new Error('Access denied. You do not own this gig.');
      error.statusCode = 403;
      return next(error);
    }

    // 3. Process text updates
    const fieldsToUpdate = ['title', 'description', 'budget', 'category', 'location', 'deadline', 'status'];
    fieldsToUpdate.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'deadline') {
          gig.deadline = new Date(req.body.deadline);
        } else {
          gig[field] = req.body[field];
        }
      }
    });

    // Validate budget
    if (req.body.budget !== undefined && req.body.budget < 0) {
      const error = new Error('Budget cannot be negative');
      error.statusCode = 400;
      return next(error);
    }

    // 4. Parse skillsRequired if updated
    if (req.body.skillsRequired !== undefined) {
      const skillsInput = req.body.skillsRequired;
      if (typeof skillsInput === 'string') {
        try {
          gig.skillsRequired = JSON.parse(skillsInput);
        } catch (e) {
          gig.skillsRequired = skillsInput.split(',').map((s) => s.trim()).filter(Boolean);
        }
      } else if (Array.isArray(skillsInput)) {
        gig.skillsRequired = skillsInput;
      }
    }

    // 5. Parse milestones if updated
    if (req.body.milestones !== undefined) {
      const milestonesInput = req.body.milestones;
      try {
        gig.milestones = typeof milestonesInput === 'string' ? JSON.parse(milestonesInput) : milestonesInput;
      } catch (e) {
        const error = new Error('Invalid milestones format. Must be a valid JSON array.');
        error.statusCode = 400;
        return next(error);
      }
    }

    // 6. Parse new attachments if uploaded
    if (req.files?.attachments) {
      const files = req.files.attachments;
      for (const file of files) {
        const cloudinaryResponse = await uploadToCloudinary(file.path);
        if (cloudinaryResponse?.secure_url) {
          gig.attachments.push(cloudinaryResponse.secure_url);
        }
      }
    }

    // 7. Save modifications
    await gig.save();

    const updatedGig = await Gig.findById(gig._id).populate('client', 'name email role');

    return res.status(200).json({
      success: true,
      message: 'Gig updated successfully',
      data: updatedGig,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a Gig
 * DELETE /api/v1/gigs/:gigId
 */
export const deleteGig = async (req, res, next) => {
  try {
    const { gigId } = req.params;
    const clientId = req.user._id;

    // 1. Query gig
    const gig = await Gig.findById(gigId);
    if (!gig) {
      const error = new Error('Gig not found');
      error.statusCode = 404;
      return next(error);
    }

    // 2. Validate ownership
    if (gig.client.toString() !== clientId.toString()) {
      const error = new Error('Access denied. You do not own this gig.');
      error.statusCode = 403;
      return next(error);
    }

    // 3. Delete gig
    await Gig.findByIdAndDelete(gigId);

    return res.status(200).json({
      success: true,
      message: 'Gig deleted successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Publish a Gig
 * PATCH /api/v1/gigs/:gigId/publish
 */
export const publishGig = async (req, res, next) => {
  try {
    const { gigId } = req.params;
    const clientId = req.user._id;

    const gig = await Gig.findById(gigId);
    if (!gig) {
      const error = new Error('Gig not found');
      error.statusCode = 404;
      return next(error);
    }

    if (gig.client.toString() !== clientId.toString()) {
      const error = new Error('Access denied. You do not own this gig.');
      error.statusCode = 403;
      return next(error);
    }

    gig.status = 'Published';
    await gig.save();

    const updatedGig = await Gig.findById(gig._id).populate('client', 'name email role');

    return res.status(200).json({
      success: true,
      message: 'Gig published successfully',
      data: updatedGig,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Close a Gig
 * PATCH /api/v1/gigs/:gigId/close
 */
export const closeGig = async (req, res, next) => {
  try {
    const { gigId } = req.params;
    const clientId = req.user._id;

    const gig = await Gig.findById(gigId);
    if (!gig) {
      const error = new Error('Gig not found');
      error.statusCode = 404;
      return next(error);
    }

    if (gig.client.toString() !== clientId.toString()) {
      const error = new Error('Access denied. You do not own this gig.');
      error.statusCode = 403;
      return next(error);
    }

    gig.status = 'Closed';
    await gig.save();

    const updatedGig = await Gig.findById(gig._id).populate('client', 'name email role');

    return res.status(200).json({
      success: true,
      message: 'Gig closed successfully',
      data: updatedGig,
    });
  } catch (error) {
    next(error);
  }
};
