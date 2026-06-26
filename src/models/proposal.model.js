import mongoose from 'mongoose';
import cacheService from '../services/cache.service.js';

const proposalSchema = new mongoose.Schema(
  {
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gig',
      required: [true, 'Gig ID is required'],
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Freelancer ID is required'],
    },
    bidAmount: {
      type: Number,
      required: [true, 'Bid amount is required'],
      min: [0, 'Bid amount cannot be negative'],
    },
    estimatedTime: {
      type: String,
      required: [true, 'Estimated delivery time is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Proposal description is required'],
      minlength: [10, 'Description must be at least 10 characters long'],
    },
    attachments: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected', 'Withdrawn', 'Negotiating'],
      default: 'Pending',
    },
    negotiation: {
      counterBidAmount: {
        type: Number,
        min: [0, 'Counter bid amount cannot be negative'],
      },
      counterTime: {
        type: String,
        trim: true,
      },
      clientNotes: {
        type: String,
        trim: true,
      },
      initiatedBy: {
        type: String,
        enum: ['Client', 'Freelancer'],
      },
    },
  },
  {
    timestamps: true,
  }
);

proposalSchema.post('save', async function (doc) {
  cacheService.del(`analytics:freelancer:${doc.freelancer}`);
  cacheService.del('admin:analytics');
  try {
    const gig = await mongoose.model('Gig').findById(doc.gig).select('client').lean();
    if (gig) {
      cacheService.del(`analytics:client:${gig.client}`);
    }
  } catch (err) {
    // Silently handle error
  }
});

// Enforce unique application: one freelancer per gig
proposalSchema.index({ gig: 1, freelancer: 1 }, { unique: true });

proposalSchema.index({ freelancer: 1 });
proposalSchema.index({ status: 1 });

const Proposal = mongoose.model('Proposal', proposalSchema);
export default Proposal;
