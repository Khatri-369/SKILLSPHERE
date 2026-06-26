import mongoose from 'mongoose';
import cacheService from '../services/cache.service.js';

const milestoneSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Milestone title is required'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  amount: {
    type: Number,
    required: [true, 'Milestone budget/amount is required'],
    min: [0, 'Milestone amount cannot be negative'],
  },
});

const gigSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Client/Owner ID is required'],
    },
    title: {
      type: String,
      required: [true, 'Gig title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters long'],
    },
    description: {
      type: String,
      required: [true, 'Gig description is required'],
    },
    budget: {
      type: Number,
      required: [true, 'Gig budget is required'],
      min: [0, 'Budget cannot be negative'],
    },
    category: {
      type: String,
      required: [true, 'Gig category is required'],
      trim: true,
    },
    location: {
      type: String,
      default: 'Remote',
      trim: true,
    },
    deadline: {
      type: Date,
      required: [true, 'Project deadline is required'],
    },
    skillsRequired: [
      {
        type: String,
        trim: true,
      },
    ],
    milestones: [milestoneSchema],
    attachments: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Closed'],
      default: 'Draft',
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

gigSchema.post('save', function (doc) {
  cacheService.del(`analytics:client:${doc.client}`);
  cacheService.del('admin:analytics');
});

gigSchema.index({ client: 1 });
gigSchema.index({ category: 1, status: 1, isApproved: 1 });
gigSchema.index({ createdAt: -1 });

const Gig = mongoose.model('Gig', gigSchema);
export default Gig;
