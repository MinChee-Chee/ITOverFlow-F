import { Schema, models, model, Document } from 'mongoose';

export interface ISupportRequest extends Document {
  userId: Schema.Types.ObjectId;
  clerkId: string;
  subject: string;
  category: 'general' | 'account' | 'technical' | 'content' | 'billing' | 'other';
  message: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  adminResponse?: string;
  respondedBy?: Schema.Types.ObjectId;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupportRequestSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    clerkId: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      enum: ['general', 'account', 'technical', 'content', 'billing', 'other'],
      required: true,
      default: 'general',
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'resolved', 'closed'],
      default: 'pending',
    },
    adminResponse: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    respondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
SupportRequestSchema.index({ userId: 1, createdAt: -1 });
SupportRequestSchema.index({ status: 1, createdAt: -1 });
SupportRequestSchema.index({ clerkId: 1 });
SupportRequestSchema.index({ category: 1 });

const SupportRequest = models.SupportRequest || model<ISupportRequest>('SupportRequest', SupportRequestSchema);

export default SupportRequest;
