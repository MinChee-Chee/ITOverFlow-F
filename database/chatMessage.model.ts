import { Schema, models, model, Document } from 'mongoose';

export interface IChatMessage extends Document {
  content: string;
  author: Schema.Types.ObjectId;
  chatGroup: Schema.Types.ObjectId;
  createdAt: Date;
}

const ChatMessageSchema = new Schema({
  content: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  chatGroup: { type: Schema.Types.ObjectId, ref: 'ChatGroup', required: true },
  createdAt: { type: Date, default: Date.now },
});

// Index for efficient querying
ChatMessageSchema.index({ chatGroup: 1, createdAt: -1 });

const ChatMessage = models.ChatMessage || model('ChatMessage', ChatMessageSchema);

export default ChatMessage;

