import Dispute from '../models/dispute.model.js';
import Gig from '../models/gig.model.js';
import Proposal from '../models/proposal.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

/**
 * Raise a new Dispute for a Gig Milestone/Payment
 * POST /api/v1/disputes
 */
export const raiseDispute = async (req, res, next) => {
  try {
    const { gigId, paymentId, title, description } = req.body;
    const raisingUserId = req.user._id;

    // 1. Validation check
    if (!gigId || !title || !description) {
      const error = new Error('Gig ID, dispute title, and description are required');
      error.statusCode = 400;
      return next(error);
    }

    // 2. Fetch Gig
    const gig = await Gig.findById(gigId);
    if (!gig) {
      const error = new Error('Gig not found');
      error.statusCode = 404;
      return next(error);
    }

    // 3. Verify connection (accepted proposal exists for this gig)
    const proposal = await Proposal.findOne({
      gig: gigId,
      status: 'Accepted',
    });

    if (!proposal) {
      const error = new Error('Verified dispute check failed. No active hired freelancer found for this gig.');
      error.statusCode = 403;
      return next(error);
    }

    // Ensure the raising user is either the Client or the Freelancer on this gig
    const isClient = gig.client.toString() === raisingUserId.toString();
    const isFreelancer = proposal.freelancer.toString() === raisingUserId.toString();

    if (!isClient && !isFreelancer) {
      const error = new Error('Access denied. You are not authorized to raise a dispute for this gig.');
      error.statusCode = 403;
      return next(error);
    }

    // Deriving opposing user party
    const againstUserId = isClient ? proposal.freelancer : gig.client;

    // 4. Prevent duplicate open disputes by same user for same gig
    const existingOpenDispute = await Dispute.findOne({
      gig: gigId,
      raisedBy: raisingUserId,
      status: 'Open',
    });

    if (existingOpenDispute) {
      const error = new Error('An active open dispute already exists for this gig.');
      error.statusCode = 400;
      return next(error);
    }

    // 5. Upload evidence attachments
    const evidenceUrls = [];
    if (req.files?.evidence) {
      const files = req.files.evidence;
      for (const file of files) {
        const cloudinaryResponse = await uploadToCloudinary(file.path);
        if (cloudinaryResponse?.secure_url) {
          evidenceUrls.push(cloudinaryResponse.secure_url);
        }
      }
    }

    // 6. Create Dispute
    const dispute = await Dispute.create({
      raisedBy: raisingUserId,
      againstUser: againstUserId,
      gig: gigId,
      payment: paymentId || undefined,
      title,
      description,
      evidence: evidenceUrls,
      status: 'Open',
    });

    return res.status(201).json({
      success: true,
      message: 'Dispute raised successfully',
      data: dispute,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's disputes (where user is raisedBy or againstUser)
 * GET /api/v1/disputes/me
 */
export const getMyDisputes = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const skip = (page - 1) * limit;

    const query = { $or: [{ raisedBy: userId }, { againstUser: userId }] };

    const disputes = await Dispute.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('raisedBy', 'name email avatar role')
      .populate('againstUser', 'name email avatar role')
      .populate('gig', 'title budget category');

    const total = await Dispute.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: 'Disputes retrieved successfully',
      data: {
        disputes,
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
 * Get dispute details by ID
 * GET /api/v1/disputes/:disputeId
 */
export const getDisputeById = async (req, res, next) => {
  try {
    const { disputeId } = req.params;
    const userId = req.user._id;

    const dispute = await Dispute.findById(disputeId)
      .populate('raisedBy', 'name email avatar role')
      .populate('againstUser', 'name email avatar role')
      .populate('gig', 'title budget category client')
      .populate('payment', 'amount currency status');

    if (!dispute) {
      const error = new Error('Dispute not found');
      error.statusCode = 404;
      return next(error);
    }

    // Auth check: User must be Admin, raisedBy user, or againstUser
    const isOwner = dispute.raisedBy._id.toString() === userId.toString();
    const isTarget = dispute.againstUser._id.toString() === userId.toString();
    const isAdmin = req.user.role === 'Admin';

    if (!isOwner && !isTarget && !isAdmin) {
      const error = new Error('Access denied. You are not authorized to view this dispute.');
      error.statusCode = 403;
      return next(error);
    }

    return res.status(200).json({
      success: true,
      message: 'Dispute details retrieved successfully',
      data: dispute,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resolve/Close Dispute (Admin only)
 * PATCH /api/v1/disputes/:disputeId/resolve
 */
export const adminResolveDispute = async (req, res, next) => {
  try {
    const { disputeId } = req.params;
    const { status, resolutionNotes } = req.body;

    if (!status || !['Resolved', 'Closed'].includes(status)) {
      const error = new Error('Invalid status. Allowed values are "Resolved" or "Closed"');
      error.statusCode = 400;
      return next(error);
    }

    if (!resolutionNotes) {
      const error = new Error('Resolution notes are required');
      error.statusCode = 400;
      return next(error);
    }

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      const error = new Error('Dispute not found');
      error.statusCode = 404;
      return next(error);
    }

    dispute.status = status;
    dispute.resolutionNotes = resolutionNotes;
    dispute.resolvedBy = req.user._id;
    dispute.resolvedAt = new Date();
    await dispute.save();

    const populatedDispute = await Dispute.findById(disputeId)
      .populate('raisedBy', 'name email')
      .populate('againstUser', 'name email')
      .populate('resolvedBy', 'name email');

    return res.status(200).json({
      success: true,
      message: `Dispute status set to ${status} by admin`,
      data: populatedDispute,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Close own dispute (Raising user only)
 * PATCH /api/v1/disputes/:disputeId/close
 */
export const closeOwnDispute = async (req, res, next) => {
  try {
    const { disputeId } = req.params;
    const raisingUserId = req.user._id;

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      const error = new Error('Dispute not found');
      error.statusCode = 404;
      return next(error);
    }

    // Verify ownership
    if (dispute.raisedBy.toString() !== raisingUserId.toString()) {
      const error = new Error('Access denied. Only the user who raised the dispute can close it.');
      error.statusCode = 403;
      return next(error);
    }

    if (dispute.status !== 'Open') {
      const error = new Error(`Cannot close dispute that is already ${dispute.status}`);
      error.statusCode = 400;
      return next(error);
    }

    dispute.status = 'Closed';
    dispute.resolutionNotes = 'Closed by raising user';
    await dispute.save();

    return res.status(200).json({
      success: true,
      message: 'Dispute successfully closed/cancelled by creator',
      data: dispute,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get all disputes list
 * GET /api/v1/disputes
 */
export const adminGetAllDisputes = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const skip = (page - 1) * limit;
    const { status } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const disputes = await Dispute.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('raisedBy', 'name email role')
      .populate('againstUser', 'name email role')
      .populate('gig', 'title budget category');

    const total = await Dispute.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: 'All disputes retrieved successfully',
      data: {
        disputes,
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
