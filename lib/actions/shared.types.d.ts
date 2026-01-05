import { Schema } from "mongoose";

import { IUser } from "@/database/user.model";

export interface CreateAnswerParams {
  content: string;
  author: string; // User ID
  question: string; // Question ID
  path: string;
}

export interface GetAnswersParams {
  questionId: string;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

export interface AnswerVoteParams {
  answerId: string;
  userId: string;
  hasupVoted: boolean;
  hasdownVoted: boolean;
  path: string;
}

export interface DeleteAnswerParams {
  answerId: string;
  path: string;
}

export interface SearchParams {
  query: string;
  type?: string | null;
}

export interface RecommendedParams {
  userId: string;
  page?: number;
  pageSize?: number;
  searchQuery?: string;
}

export interface ViewQuestionParams {
  questionId: string;
  userId: string | undefined;
}

export interface JobFilterParams {
  query: string;
  page: string;
}

export interface GetQuestionsParams {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  filter?: string;
}

export interface CreateQuestionParams {
  title: string;
  content: string;
  tags: string[];
  author: Schema.Types.ObjectId | IUser;
  path: string;
}

export interface GetQuestionByIdParams {
  questionId: string;
}

export interface QuestionVoteParams {
  questionId: string;
  userId: string;
  hasupVoted: boolean;
  hasdownVoted: boolean;
  path: string;
}

export interface DeleteQuestionParams {
  questionId: string;
  path: string;
}

export interface EditQuestionParams {
  questionId: string;
  title: string;
  content: string;
  path: string;
}

export interface GetAllTagsParams {
  page?: number;
  pageSize?: number;
  filter?: string;
  searchQuery?: string;
}

export interface GetQuestionsByTagIdParams {
  tagId: string;
  page?: number;
  pageSize?: number;
  searchQuery?: string;
}

export interface GetTopInteractedTagsParams {
  userId: string;
  limit?: number;
}

export interface CreateUserParams {
  clerkId: string;
  name: string;
  username: string;
  email: string;
  picture: string;
  termsAccepted?: boolean;
}

export interface GetUserByIdParams {
  userId: string;
}

export interface GetAllUsersParams {
  page?: number;
  pageSize?: number;
  filter?: string;
  searchQuery?: string; // Add searchQuery parameter
}

export interface UpdateUserParams {
  clerkId: string;
  updateData: Partial<IUser>;
  path: string;
}

export interface ToggleSaveQuestionParams {
  userId: string;
  questionId: string;
  path: string;
}

export interface GetSavedQuestionsParams {
  clerkId: string;
  page?: number;
  pageSize?: number;
  filter?: string;
  searchQuery?: string;
}

export interface GetUserStatsParams {
  userId: string;
  page?: number;
  pageSize?: number;
}

export interface DeleteUserParams {
  clerkId: string;
}

export interface CreateChatGroupParams {
  name: string;
  description?: string;
  tags: string[];
  moderatorId: string;
  path: string;
}

export interface GetChatGroupsParams {
  tagId?: string;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
  currentUserId?: string;
  joinedOnly?: boolean;
}

export interface JoinChatGroupParams {
  chatGroupId: string;
  userId: string;
  path: string;
}

export interface SendMessageParams {
  content: string;
  authorId: string;
  chatGroupId: string;
  path: string;
}

export interface GetMessagesParams {
  chatGroupId: string;
  page?: number;
  pageSize?: number;
  userId?: string; // Optional userId to check ban status
}

export interface DeleteMessageParams {
  messageId: string;
  userId: string; // User ID to verify ownership
  path: string;
}

export interface UpdateChatGroupParams {
  chatGroupId: string;
  name: string;
  description?: string;
  tags: string[];
  path: string;
}

export interface DeleteChatGroupParams {
  chatGroupId: string;
  path: string;
}

export interface BanUserFromChatGroupParams {
  chatGroupId: string;
  userId: string; // User to ban
  moderatorId: string; // Moderator performing the ban
  path: string;
}

export interface GetModeratorChatGroupsParams {
  moderatorId: string;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateReportParams {
  type: 'question' | 'answer' | 'comment' | 'chatMessage';
  questionId?: string;
  answerId?: string;
  commentId?: string;
  chatMessageId?: string;
  reporterId: string;
  reason: string;
  path: string;
}

export interface GetReportsParams {
  page?: number;
  pageSize?: number;
  status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  searchQuery?: string;
}

export interface UpdateReportStatusParams {
  reportId: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy: string;
  path: string;
}

export interface CreateWarningParams {
  userId: string;
  moderatorId: string;
  questionId?: string;
  reason: string;
  message: string;
}

export interface GetWarningsParams {
  userId: string;
  includeRead?: boolean;
}

export interface MarkWarningAsReadParams {
  warningId: string;
  userId: string;
}

export interface DeleteQuestionWithWarningParams {
  questionId: string;
  moderatorId: string;
  reason: string;
  message: string;
  path: string;
}

export interface DeleteAnswerWithWarningParams {
  answerId: string;
  moderatorId: string;
  reason: string;
  message: string;
  path: string;
}

export interface DeleteCommentWithWarningParams {
  commentId: string;
  moderatorId: string;
  reason: string;
  message: string;
  path: string;
}

export interface CreateCommentParams {
  content: string;
  author: string; // User ID
  answerId: string; // Answer ID
  path: string;
}

export interface GetCommentsParams {
  answerId: string;
}

export interface DeleteCommentParams {
  commentId: string;
  path: string;
}