import { Schema, models, model, Document } from 'mongoose';

export interface IComment extends Document {
    author: Schema.Types.ObjectId;
    answer: Schema.Types.ObjectId;
    content: string;
    createdAt: Date;
}

const CommentSchema = new Schema({
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    answer: { type: Schema.Types.ObjectId, ref: 'Answer', required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
})

const Comment = models.Comment || model('Comment', CommentSchema);

export default Comment;
