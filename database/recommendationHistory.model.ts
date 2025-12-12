import { Schema, model, models, Document } from "mongoose";

export interface IRecommendationHistory extends Document {
  clerkId?: string;
  query: string;
  topK: number;
  resultIds: string[];
  distances?: number[];
  createdAt: Date;
}

const RecommendationHistorySchema = new Schema<IRecommendationHistory>({
  clerkId: { type: String, index: true },
  query: { type: String, required: true },
  topK: { type: Number, required: true },
  resultIds: [{ type: String }],
  distances: [{ type: Number }],
  createdAt: { type: Date, default: Date.now },
});

const RecommendationHistory =
  models.RecommendationHistory ||
  model<IRecommendationHistory>(
    "RecommendationHistory",
    RecommendationHistorySchema
  );

export default RecommendationHistory;

