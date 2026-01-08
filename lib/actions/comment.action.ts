"use server"

import Comment from "@/database/comment.model";
import { connectToDatabase } from "../mongoose";
import { CreateCommentParams, DeleteCommentParams, GetCommentsParams } from "./shared.types";
import Answer from "@/database/answer.model";
import { revalidatePath } from "next/cache";
import User from "@/database/user.model";
import { notifyUserByClerkId } from "../push-notifications";

export async function createComment(params: CreateCommentParams) {
  try {
    await connectToDatabase();

    const { content, author, answerId, path } = params;

    const newComment = await Comment.create({ content, author, answer: answerId });
    
    const answer = await Answer.findById(answerId)
      .populate("author", "clerkId")
      .populate("question", "title");

    if (!answer) {
      throw new Error("Answer not found while creating comment");
    }

    const commentingUser = await User.findById(author);

    if (
      answer.author &&
      answer.author._id.toString() !== author.toString() &&
      (answer.author as any).clerkId
    ) {
      notifyUserByClerkId({
        clerkId: (answer.author as any).clerkId,
        title: `${commentingUser?.name ?? "Someone"} commented on your answer`,
        body: `A new comment was added to your answer.`,
        path: path,
        data: {
          type: "comment_created",
          answerId: answerId,
          commentId: newComment._id.toString(),
        },
      }).catch((error) => {
        console.error("[Comment] Failed to send notification:", error);
      });
    }

    revalidatePath(path);
    return newComment;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getComments(params: GetCommentsParams) {
  try {
    await connectToDatabase();

    const { answerId } = params;

    const comments = await Comment.find({ answer: answerId })
      .populate("author", "_id clerkId name picture")
      .sort({ createdAt: 1 });

    return { comments };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function deleteComment(params: DeleteCommentParams) {
  try {
    await connectToDatabase();

    const { commentId, path } = params;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      throw new Error("Comment not found");
    }

    await comment.deleteOne({ _id: commentId });

    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}
