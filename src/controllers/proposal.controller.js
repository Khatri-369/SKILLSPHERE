import Proposal from '../models/proposal.model.js';
import Gig from '../models/gig.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

/**
 * Apply to a Gig (Submit Proposal)
 * POST /api/v1/proposals
 */
export const applyToGig = async (req, res, next) => {
  try {
    const { gigId, bidAmount, estimatedTime, description } = req.body;
    const freelancerId = req.user._id;

    // 1. Validation
    if (!gigId || !bidAmount || !estimatedTime || !description) {
      const error = new Error('Gig ID, bid amount, estimated time, and description are required');
      error.statusCode = 400;
      return next(error);
    }

    if (bidAmount < 0) {
      const error = new Error('Bid amount cannot be negative');
      error.statusCode = 400;
      return next(error);
    }

    // 2. Verify Gig exists and is published
    const gig = await Gig.findById(gigId);
    if (!gig) {
      const error = new Error('Gig not found');
      error.statusCode = 404;
      return next(error);
    }

    if (gig.status !== 'Published') {
      const error = new Error('Cannot apply to a gig that is not published');
      error.statusCode = 400;
      return next(error);
    }

    // 3. Prevent Client from applying to their own gig
    if (gig.client.toString() === freelancerId.toString()) {
      const error = new Error('You cannot apply to your own gig');
      error.statusCode = 400;
      return next(error);
    }

    // 4. Verify no duplicate application (exclude withdrawn proposals)
    const existingProposal = await Proposal.findOne({ gig: gigId, freelancer: freelancerId });
    if (existingProposal) {
      if (existingProposal.status !== 'Withdrawn') {
        const error = new Error('You have already submitted a proposal for this gig');
        error.statusCode = 400;
        return next(error);
      }
      // If it is Withdrawn, delete it to avoid unique key violation when creating the new one
      await Proposal.deleteOne({ _id: existingProposal._id });
    }

    // 5. Upload files
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

    // 6. Create Proposal
    const proposal = await Proposal.create({
      gig: gigId,
      freelancer: freelancerId,
      bidAmount,
      estimatedTime,
      description,
      attachments: attachmentUrls,
      status: 'Pending',
    });

    const populatedProposal = await Proposal.findById(proposal._id)
      .populate('gig', 'title description budget client')
      .populate('freelancer', 'name email avatar');

    return res.status(201).json({
      success: true,
      message: 'Proposal submitted successfully',
      data: populatedProposal,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Proposal (Freelancer)
 * PATCH /api/v1/proposals/:proposalId
 */
export const updateProposal = async (req, res, next) => {
  try {
    const { proposalId } = req.params;
    const freelancerId = req.user._id;

    // 1. Query proposal
    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      const error = new Error('Proposal not found');
      error.statusCode = 404;
      return next(error);
    }

    // 2. Verify ownership
    if (proposal.freelancer.toString() !== freelancerId.toString()) {
      const error = new Error('Access denied. You do not own this proposal.');
      error.statusCode = 403;
      return next(error);
    }

    // 3. Block updates on finalized/withdrawn proposals
    if (proposal.status === 'Accepted' || proposal.status === 'Rejected' || proposal.status === 'Withdrawn') {
      const error = new Error(`Cannot update a proposal that has already been ${proposal.status.toLowerCase()}`);
      error.statusCode = 400;
      return next(error);
    }

    // 4. Handle text parameter updates
    const { bidAmount, estimatedTime, description } = req.body;
    if (bidAmount !== undefined) {
      if (bidAmount < 0) {
        const error = new Error('Bid amount cannot be negative');
        error.statusCode = 400;
        return next(error);
      }
      proposal.bidAmount = bidAmount;
    }
    if (estimatedTime !== undefined) proposal.estimatedTime = estimatedTime;
    if (description !== undefined) proposal.description = description;

    // 5. Upload files if provided
    if (req.files?.attachments) {
      const files = req.files.attachments;
      for (const file of files) {
        const cloudinaryResponse = await uploadToCloudinary(file.path);
        if (cloudinaryResponse?.secure_url) {
          proposal.attachments.push(cloudinaryResponse.secure_url);
        }
      }
    }

    // 6. If proposal was in Negotiating status, update resets it to Pending and clears negotiation terms
    if (proposal.status === 'Negotiating') {
      proposal.status = 'Pending';
      proposal.negotiation = undefined;
    }

    await proposal.save();

    const updatedProposal = await Proposal.findById(proposal._id)
      .populate('gig', 'title description budget client')
      .populate('freelancer', 'name email avatar');

    return res.status(200).json({
      success: true,
      message: 'Proposal updated successfully',
      data: updatedProposal,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Withdraw Proposal (Freelancer)
 * PATCH /api/v1/proposals/:proposalId/withdraw
 */
export const withdrawProposal = async (req, res, next) => {
  try {
    const { proposalId } = req.params;
    const freelancerId = req.user._id;

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      const error = new Error('Proposal not found');
      error.statusCode = 404;
      return next(error);
    }

    if (proposal.freelancer.toString() !== freelancerId.toString()) {
      const error = new Error('Access denied. You do not own this proposal.');
      error.statusCode = 403;
      return next(error);
    }

    if (proposal.status === 'Accepted' || proposal.status === 'Rejected') {
      const error = new Error(`Cannot withdraw a proposal that has already been ${proposal.status.toLowerCase()}`);
      error.statusCode = 400;
      return next(error);
    }

    proposal.status = 'Withdrawn';
    await proposal.save();

    return res.status(200).json({
      success: true,
      message: 'Proposal withdrawn successfully',
      data: proposal,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Proposal By ID
 * GET /api/v1/proposals/:proposalId
 */
export const getProposalById = async (req, res, next) => {
  try {
    const { proposalId } = req.params;
    const userId = req.user._id;

    const proposal = await Proposal.findById(proposalId)
      .populate('gig', 'title description budget client')
      .populate('freelancer', 'name email avatar');

    if (!proposal) {
      const error = new Error('Proposal not found');
      error.statusCode = 404;
      return next(error);
    }

    // Auth check: Freelancer owner or Client owner of the Gig
    const isFreelancerOwner = proposal.freelancer._id.toString() === userId.toString();
    const isClientOwner = proposal.gig.client.toString() === userId.toString();

    if (!isFreelancerOwner && !isClientOwner && req.user.role !== 'Admin') {
      const error = new Error('Access denied. You are not authorized to view this proposal.');
      error.statusCode = 403;
      return next(error);
    }

    return res.status(200).json({
      success: true,
      message: 'Proposal retrieved successfully',
      data: proposal,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get own proposals (Freelancer)
 * GET /api/v1/proposals/me
 */
export const getMyProposals = async (req, res, next) => {
  try {
    const freelancerId = req.user._id;

    const proposals = await Proposal.find({ freelancer: freelancerId })
      .populate('gig', 'title description budget client status')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Proposals retrieved successfully',
      data: proposals,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Proposals for a Gig (Client owner)
 * GET /api/v1/proposals/gig/:gigId
 */
export const getProposalsForGig = async (req, res, next) => {
  try {
    const { gigId } = req.params;
    const clientId = req.user._id;

    // 1. Verify gig and client ownership
    const gig = await Gig.findById(gigId);
    if (!gig) {
      const error = new Error('Gig not found');
      error.statusCode = 404;
      return next(error);
    }

    if (gig.client.toString() !== clientId.toString() && req.user.role !== 'Admin') {
      const error = new Error('Access denied. You do not own this gig.');
      error.statusCode = 403;
      return next(error);
    }

    // 2. Fetch proposals (except withdrawn proposals, unless requested)
    const proposals = await Proposal.find({ gig: gigId, status: { $ne: 'Withdrawn' } })
      .populate('freelancer', 'name email avatar')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Proposals for gig retrieved successfully',
      data: proposals,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Accept Proposal (Client)
 * PATCH /api/v1/proposals/:proposalId/accept
 */
export const acceptProposal = async (req, res, next) => {
  try {
    const { proposalId } = req.params;
    const clientId = req.user._id;

    const proposal = await Proposal.findById(proposalId).populate('gig');
    if (!proposal) {
      const error = new Error('Proposal not found');
      error.statusCode = 404;
      return next(error);
    }

    if (proposal.gig.client.toString() !== clientId.toString()) {
      const error = new Error('Access denied. You do not own the gig related to this proposal.');
      error.statusCode = 403;
      return next(error);
    }

    if (proposal.status === 'Withdrawn') {
      const error = new Error('Cannot accept a withdrawn proposal');
      error.statusCode = 400;
      return next(error);
    }

    proposal.status = 'Accepted';
    proposal.negotiation = undefined; // clear negotiations on accept
    await proposal.save();

    // 4. Update the related Gig status to Closed
    const gig = await Gig.findById(proposal.gig._id);
    if (gig) {
      gig.status = 'Closed';
      await gig.save();
    }

    // 5. Automatically reject all other pending/negotiating proposals for this gig
    await Proposal.updateMany(
      {
        gig: proposal.gig._id,
        _id: { $ne: proposal._id },
        status: { $in: ['Pending', 'Negotiating'] },
      },
      {
        $set: { status: 'Rejected', negotiation: undefined },
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Proposal accepted successfully',
      data: proposal,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject Proposal (Client)
 * PATCH /api/v1/proposals/:proposalId/reject
 */
export const rejectProposal = async (req, res, next) => {
  try {
    const { proposalId } = req.params;
    const clientId = req.user._id;

    const proposal = await Proposal.findById(proposalId).populate('gig');
    if (!proposal) {
      const error = new Error('Proposal not found');
      error.statusCode = 404;
      return next(error);
    }

    if (proposal.gig.client.toString() !== clientId.toString()) {
      const error = new Error('Access denied. You do not own the gig related to this proposal.');
      error.statusCode = 403;
      return next(error);
    }

    if (proposal.status === 'Withdrawn') {
      const error = new Error('Cannot reject a withdrawn proposal');
      error.statusCode = 400;
      return next(error);
    }

    proposal.status = 'Rejected';
    proposal.negotiation = undefined;
    await proposal.save();

    return res.status(200).json({
      success: true,
      message: 'Proposal rejected successfully',
      data: proposal,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Negotiate Proposal (Client Proposes counter terms)
 * PATCH /api/v1/proposals/:proposalId/negotiate
 */
export const negotiateProposal = async (req, res, next) => {
  try {
    const { proposalId } = req.params;
    const { counterBidAmount, counterTime, clientNotes } = req.body;
    const clientId = req.user._id;

    if (!counterBidAmount || !counterTime) {
      const error = new Error('Counter bid amount and counter delivery time are required to negotiate');
      error.statusCode = 400;
      return next(error);
    }

    if (counterBidAmount < 0) {
      const error = new Error('Counter bid amount cannot be negative');
      error.statusCode = 400;
      return next(error);
    }

    const proposal = await Proposal.findById(proposalId).populate('gig');
    if (!proposal) {
      const error = new Error('Proposal not found');
      error.statusCode = 404;
      return next(error);
    }

    if (proposal.gig.client.toString() !== clientId.toString()) {
      const error = new Error('Access denied. You do not own the gig related to this proposal.');
      error.statusCode = 403;
      return next(error);
    }

    if (proposal.status === 'Withdrawn' || proposal.status === 'Accepted' || proposal.status === 'Rejected') {
      const error = new Error(`Cannot negotiate a proposal with status: ${proposal.status}`);
      error.statusCode = 400;
      return next(error);
    }

    proposal.status = 'Negotiating';
    proposal.negotiation = {
      counterBidAmount,
      counterTime,
      clientNotes: clientNotes || '',
      initiatedBy: 'Client',
    };

    await proposal.save();

    return res.status(200).json({
      success: true,
      message: 'Proposal negotiation terms submitted successfully',
      data: proposal,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Respond to Negotiation (Freelancer responds to client counter offer)
 * PATCH /api/v1/proposals/:proposalId/negotiate/respond
 */
export const respondToNegotiation = async (req, res, next) => {
  try {
    const { proposalId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'
    const freelancerId = req.user._id;

    if (!action || !['accept', 'reject'].includes(action)) {
      const error = new Error('Invalid action. Action must be either "accept" or "reject"');
      error.statusCode = 400;
      return next(error);
    }

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      const error = new Error('Proposal not found');
      error.statusCode = 404;
      return next(error);
    }

    if (proposal.freelancer.toString() !== freelancerId.toString()) {
      const error = new Error('Access denied. You do not own this proposal.');
      error.statusCode = 403;
      return next(error);
    }

    if (proposal.status !== 'Negotiating' || !proposal.negotiation || proposal.negotiation.initiatedBy !== 'Client') {
      const error = new Error('No active client negotiation counter-offer to respond to');
      error.statusCode = 400;
      return next(error);
    }

    if (action === 'accept') {
      // Apply counter offer terms
      proposal.bidAmount = proposal.negotiation.counterBidAmount;
      proposal.estimatedTime = proposal.negotiation.counterTime;
      proposal.status = 'Accepted';
      proposal.negotiation = undefined;
    } else {
      // Reject counter offer: resets status back to Pending and clears negotiation terms
      proposal.status = 'Pending';
      proposal.negotiation = undefined;
    }

    await proposal.save();

    return res.status(200).json({
      success: true,
      message: `Negotiation terms successfully ${action}ed`,
      data: proposal,
    });
  } catch (error) {
    next(error);
  }
};
