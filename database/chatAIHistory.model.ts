import { Schema, model, models, Document } from "mongoose";

export interface IChatAIHistory extends Document {
  clerkId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    citations?: Array<{
      position: number;
      references: Array<{
        pages?: number[];
        file?: {
          name?: string;
          id?: string;
          metadata?: Record<string, any>;
        };
      }>;
    }>;
  }>;
  aiModel?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ChatAIHistorySchema = new Schema<IChatAIHistory>(
  {
    clerkId: { type: String, required: true, index: true },
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        citations: [
          {
            position: { type: Number },
            references: [
              {
                pages: [{ type: Number }],
                file: {
                  name: { type: String },
                  id: { type: String },
                  metadata: { type: Schema.Types.Mixed },
                },
              },
            ],
          },
        ],
      },
    ],
    aiModel: { type: String },
    usage: {
      prompt_tokens: { type: Number },
      completion_tokens: { type: Number },
      total_tokens: { type: Number },
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
ChatAIHistorySchema.index({ clerkId: 1, createdAt: -1 });

const ChatAIHistory =
  models.ChatAIHistory ||
  model<IChatAIHistory>("ChatAIHistory", ChatAIHistorySchema);

export default ChatAIHistory;
