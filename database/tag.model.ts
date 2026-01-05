import { Schema, model, models, Document } from 'mongoose';

export interface ITag extends Document {
  name: string;
  description: string;
  questions: Schema.Types.ObjectId[];
  followers: Schema.Types.ObjectId[];
  createdOn: Date;
}

const TagSchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }], 
  followers: [{ type: Schema.Types.ObjectId, ref: 'User' }], 
  createdOn: { type: Date, default: Date.now },
});

// Add indexes for frequently queried fields
// Note: name already has an index from unique: true, so we don't duplicate it
TagSchema.index({ name: 'text', description: 'text' }) // Text search index (different from unique index)
TagSchema.index({ questions: 1 }) // For tag question queries

const Tag = models.Tag || model('Tag', TagSchema);

export default Tag;