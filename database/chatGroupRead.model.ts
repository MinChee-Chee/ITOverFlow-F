import { Schema, models, model, Document } from 'mongoose';

export interface IChatGroupRead extends Document {
  user: Schema.Types.ObjectId;
  chatGroup: Schema.Types.ObjectId;
  lastReadAt: Date;
}

const ChatGroupReadSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  chatGroup: { type: Schema.Types.ObjectId, ref: 'ChatGroup', required: true },
  lastReadAt: { type: Date, default: Date.now },
});

// One record per user+chatGroup
ChatGroupReadSchema.index({ user: 1, chatGroup: 1 }, { unique: true });
ChatGroupReadSchema.index({ chatGroup: 1, user: 1 });

const ChatGroupRead =
  models.ChatGroupRead || model('ChatGroupRead', ChatGroupReadSchema);

export default ChatGroupRead;


