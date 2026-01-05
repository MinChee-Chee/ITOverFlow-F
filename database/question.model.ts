import { Schema, models, model, Document } from 'mongoose';

export interface IQuestion extends Document {
  title: string;
  content: string;
  tags: Schema.Types.ObjectId[];
  views: number;
  upvotes: Schema.Types.ObjectId[];
  downvotes: Schema.Types.ObjectId[];
  author: Schema.Types.ObjectId;
  answers: Schema.Types.ObjectId[];
  createdAt: Date;
}

const QuestionSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
  views: { type: Number, default: 0 },
  upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  downvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  author: { type: Schema.Types.ObjectId, ref: 'User' },
  answers: [{ type: Schema.Types.ObjectId, ref: 'Answer' }],
  createdAt: { type: Date, default: Date.now }
})

// Add indexes for frequently queried fields
QuestionSchema.index({ createdAt: -1 }) // For newest filter
QuestionSchema.index({ views: -1 }) // For frequent filter
QuestionSchema.index({ author: 1 }) // For author queries
QuestionSchema.index({ tags: 1 }) // For tag queries
QuestionSchema.index({ title: 'text', content: 'text' }) // For text search
QuestionSchema.index({ answers: 1 }) // For unanswered filter

const Question = models.Question || model('Question', QuestionSchema);

export default Question;