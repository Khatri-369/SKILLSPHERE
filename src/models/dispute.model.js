import mongoose from 'mongoose';

const disputeSchema = new mongoose.Schema(
  {
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Dispute creator ID is required'],
    },
    againstUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Opposing party user ID is required'],
    },
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gig',
      required: [true, 'Gig ID is required'],
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    title: {
      type: String,
      required: [true, 'Dispute title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Dispute description is required'],
      trim: true,
    },
    evidence: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ['Open', 'Closed', 'Resolved'],
      default: 'Open',
    },
    resolutionNotes: {
      type: String,
      trim: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

disputeSchema.index({ raisedBy: 1, againstUser: 1, createdAt: -1 });

const Dispute = mongoose.model('Dispute', disputeSchema);
export default Dispute;
