import { Schema, models, model, Document } from 'mongoose';

export interface IUser extends Document {
  clerkId: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  bio?: string;
  picture: string;
  location?: string;
  portfolioWebsite?: string;
  reputation?: number;
  saved: Schema.Types.ObjectId[];
  joinedAt: Date;
  termsAccepted?: boolean;
  termsAcceptedAt?: Date;
}

const UserSchema = new Schema({
  clerkId: { type: String, required: true },
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  bio: { type: String },
  picture: { type: String, required: true },
  location: { type: String },
  portfolioWebsite: { type: String },
  reputation: { type: Number, default: 0 },
  saved: [{ type: Schema.Types.ObjectId, ref: 'Question' }], 
  joinedAt: { type: Date, default: Date.now },
  termsAccepted: { type: Boolean, default: false },
  termsAcceptedAt: { type: Date },
});

// Add indexes for frequently queried fields
// Note: username and email already have indexes from unique: true, so we don't duplicate them
UserSchema.index({ clerkId: 1 }, { unique: true }) // Explicit index for clerkId lookups
UserSchema.index({ name: 'text' }) // Text search index (different from unique index)

const User = models.User || model('User', UserSchema);

export default User;