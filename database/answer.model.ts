import { Schema, models, model, Document } from 'mongoose';

export interface IAnswer extends Document {
    author: Schema.Types.ObjectId;
    question: Schema.Types.ObjectId;
    content: string;
    upvotes: Schema.Types.ObjectId[];
    downvotes: Schema.Types.ObjectId[];
    createdAt: Date;
}

const AnswerSchema = new Schema({
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    content: { type: String, required: true },
    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now }
})

// Add indexes for frequently queried fields
AnswerSchema.index({ question: 1, createdAt: -1 }) // For question answers
AnswerSchema.index({ author: 1 }) // For author queries
AnswerSchema.index({ createdAt: -1 }) // For recent answers

const Answer = models.Answer || model('Answer', AnswerSchema);

export default Answer;