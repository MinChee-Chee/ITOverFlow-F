import { Schema, models, model, Document } from 'mongoose';

export interface IChatGroup extends Document {
  name: string;
  description?: string;
  tags: Schema.Types.ObjectId[];
  moderator: Schema.Types.ObjectId;
  members: Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatGroupSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  tags: [{ type: Schema.Types.ObjectId, ref: 'Tag', required: true }],
  moderator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for efficient querying
ChatGroupSchema.index({ moderator: 1, createdAt: -1 }); // For getModeratorChatGroups
ChatGroupSchema.index({ members: 1, updatedAt: -1 }); // For getUserChatGroups
ChatGroupSchema.index({ tags: 1 }); // For filtering by tags
ChatGroupSchema.index({ name: 'text', description: 'text' }); // Text search index
ChatGroupSchema.index({ createdAt: -1 }); // For sorting by creation date

// Ensure moderator is automatically added to members
ChatGroupSchema.pre('save', function(next) {
  if (this.isNew && this.moderator && !this.members.includes(this.moderator)) {
    this.members.push(this.moderator);
  }
  this.updatedAt = new Date();
  next();
});

const ChatGroup = models.ChatGroup || model('ChatGroup', ChatGroupSchema);

export default ChatGroup;

