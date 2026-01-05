import { Schema, models, model, Document } from 'mongoose';

export interface IWarning extends Document {
  user: Schema.Types.ObjectId; // User who received the warning
  moderator: Schema.Types.ObjectId; // Moderator who issued the warning
  question?: Schema.Types.ObjectId; // Question that was deleted (optional)
  reason: string; // Reason for the warning
  message: string; // Warning message to the user
  isRead: boolean; // Whether the user has read the warning
  createdAt: Date;
  readAt?: Date; // When the warning was read
}

const WarningSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  moderator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: Schema.Types.ObjectId, ref: 'Question' },
  reason: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  readAt: { type: Date }
})

const Warning = models.Warning || model('Warning', WarningSchema);

export default Warning;
