import mongoose from 'mongoose';
import cacheService from '../services/cache.service.js';

const experienceTimelineSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Experience title is required'],
  },
  company: {
    type: String,
    required: [true, 'Company name is required'],
  },
  duration: {
    type: String,
    required: [true, 'Duration description is required (e.g. 2 years)'],
  },
  description: {
    type: String,
    default: '',
  },
});

const freelancerProfileSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      unique: true, // Ensuring each user has at most one Freelancer Profile
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    skillLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Expert'],
      default: 'Intermediate',
    },
    hourlyRate: {
      type: Number,
      required: [true, 'Hourly rate is required'],
      min: [0, 'Hourly rate cannot be negative'],
    },
    certificates: [
      {
        type: String,
        trim: true,
      },
    ],
    portfolio: [
      {
        type: String,
        trim: true,
      },
    ],
    availability: {
      type: String,
      enum: ['Available', 'Busy', 'Part-time'],
      default: 'Available',
    },
    languages: [
      {
        type: String,
        trim: true,
      },
    ],
    experienceTimeline: [experienceTimelineSchema],
    verificationBadge: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be below 0'],
      max: [5, 'Rating cannot be above 5'],
    },
    reviewsCount: {
      type: Number,
      default: 0,
    },
    profileViews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

freelancerProfileSchema.post('save', function (doc) {
  cacheService.del(`analytics:freelancer:${doc.owner}`);
});

freelancerProfileSchema.index({ skills: 1 });
freelancerProfileSchema.index({ availability: 1 });
freelancerProfileSchema.index({ hourlyRate: 1 });

const FreelancerProfile = mongoose.model('FreelancerProfile', freelancerProfileSchema);
export default FreelancerProfile;
