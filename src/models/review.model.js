import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewer ID is required'],
    },
    reviewedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewed user ID is required'],
    },
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gig',
      required: [true, 'Gig ID is required'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot be more than 5'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'Comment cannot be more than 500 characters'],
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate reviews by the same reviewer for the same gig
reviewSchema.index({ gig: 1, reviewer: 1 }, { unique: true });
reviewSchema.index({ reviewedUser: 1, createdAt: -1 });

// Static method to calculate average rating and review counts
reviewSchema.statics.calculateAverageRating = async function (reviewedUserId) {
  const stats = await this.aggregate([
    {
      $match: { reviewedUser: reviewedUserId },
    },
    {
      $group: {
        _id: '$reviewedUser',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  const FreelancerProfile = mongoose.model('FreelancerProfile');
  if (stats.length > 0) {
    await FreelancerProfile.findOneAndUpdate(
      { owner: reviewedUserId },
      {
        rating: Math.round(stats[0].avgRating * 10) / 10,
        reviewsCount: stats[0].nRating,
      }
    );
  } else {
    // If no reviews left, reset to defaults
    await FreelancerProfile.findOneAndUpdate(
      { owner: reviewedUserId },
      {
        rating: 0,
        reviewsCount: 0,
      }
    );
  }
};

// Post-save hook to update average rating and count on profile
reviewSchema.post('save', async function () {
  const FreelancerProfile = mongoose.model('FreelancerProfile');
  const profileExists = await FreelancerProfile.exists({ owner: this.reviewedUser });
  if (profileExists) {
    await this.constructor.calculateAverageRating(this.reviewedUser);
  }
});

// Post-delete hook (specifically supporting findOneAndDelete/deleteModel calls)
reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    const FreelancerProfile = mongoose.model('FreelancerProfile');
    const profileExists = await FreelancerProfile.exists({ owner: doc.reviewedUser });
    if (profileExists) {
      await doc.constructor.calculateAverageRating(doc.reviewedUser);
    }
  }
});

const Review = mongoose.model('Review', reviewSchema);
export default Review;
