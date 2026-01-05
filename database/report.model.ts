import { Schema, models, model, Document } from 'mongoose';

export interface IReport extends Document {
  reporter: Schema.Types.ObjectId; // User who reported
  type: 'question' | 'answer' | 'comment' | 'chatMessage'; // Type of content being reported
  question?: Schema.Types.ObjectId; // Question being reported (if type is 'question')
  answer?: Schema.Types.ObjectId; // Answer being reported (if type is 'answer')
  comment?: Schema.Types.ObjectId; // Comment being reported (if type is 'comment')
  chatMessage?: Schema.Types.ObjectId; // Chat message being reported (if type is 'chatMessage')
  reason: string; // Reason for reporting
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'; // Status of the report
  reviewedBy?: Schema.Types.ObjectId; // Moderator who reviewed
  reviewedAt?: Date; // When it was reviewed
  createdAt: Date;
}

const ReportSchema = new Schema({
  reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['question', 'answer', 'comment', 'chatMessage'], 
    required: true 
  },
  question: { 
    type: Schema.Types.ObjectId, 
    ref: 'Question',
    required: false,
    default: null
  },
  answer: { 
    type: Schema.Types.ObjectId, 
    ref: 'Answer',
    required: false,
    default: null
  },
  comment: { 
    type: Schema.Types.ObjectId, 
    ref: 'Comment',
    required: false,
    default: null
  },
  chatMessage: { 
    type: Schema.Types.ObjectId, 
    ref: 'ChatMessage',
    required: false,
    default: null
  },
  reason: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'], 
    default: 'pending' 
  },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
})

// Custom validation to ensure the correct field is provided based on type
ReportSchema.pre('save', function(next) {
  if (this.type === 'question' && !this.question) {
    return next(new Error('Question is required when type is question'))
  }
  if (this.type === 'answer' && !this.answer) {
    return next(new Error('Answer is required when type is answer'))
  }
  if (this.type === 'comment' && !this.comment) {
    return next(new Error('Comment is required when type is comment'))
  }
  if (this.type === 'chatMessage' && !this.chatMessage) {
    return next(new Error('Chat message is required when type is chatMessage'))
  }
  next()
})

// Delete existing model if it exists to force recompilation with new schema
if (models.Report) {
  delete models.Report
}

const Report = model('Report', ReportSchema);

export default Report;
