"use server"

import { connectToDatabase } from "../mongoose"
import Warning from "@/database/warning.model"
import User from "@/database/user.model"
import Question from "@/database/question.model"
import Answer from "@/database/answer.model"
import Comment from "@/database/comment.model"
import Interaction from "@/database/interaction.model"
import Tag from "@/database/tag.model"
import { revalidatePath } from "next/cache"
import { CreateWarningParams, GetWarningsParams, MarkWarningAsReadParams, DeleteQuestionWithWarningParams, DeleteAnswerWithWarningParams, DeleteCommentWithWarningParams } from "./shared.types"
import { notifyUserByClerkId } from "../push-notifications"

export async function createWarning(params: CreateWarningParams) {
  try {
    await connectToDatabase()

    const { userId, moderatorId, questionId, reason, message } = params

    const warning = await Warning.create({
      user: userId,
      moderator: moderatorId,
      question: questionId,
      reason: reason.trim(),
      message: message.trim(),
      isRead: false
    })

    // Get user to send push notification
    const user = await User.findById(userId)
    if (user) {
      try {
        await notifyUserByClerkId({
          clerkId: user.clerkId,
          title: "Warning: Content Violation",
          body: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
        })
      } catch (error) {
        console.error("Failed to send push notification for warning:", error)
        // Don't throw - notification failure shouldn't prevent warning creation
      }
    }

    return { success: true, warning }
  } catch (error) {
    console.error("Error creating warning:", error)
    return { error: "Failed to create warning. Please try again." }
  }
}

export async function getWarnings(params: GetWarningsParams) {
  try {
    await connectToDatabase()

    const { userId, includeRead = false } = params

    const query: any = { user: userId }
    if (!includeRead) {
      query.isRead = false
    }

    const warnings = await Warning.find(query)
      .populate({
        path: 'moderator',
        model: User,
        select: '_id clerkId name username picture'
      })
      .populate({
        path: 'question',
        model: Question,
        select: '_id title',
        strictPopulate: false
      })
      .sort({ createdAt: -1 })

    return {
      warnings: JSON.parse(JSON.stringify(warnings)),
      unreadCount: warnings.filter((w: any) => !w.isRead).length
    }
  } catch (error) {
    console.error("Error fetching warnings:", error)
    return { warnings: [], unreadCount: 0 }
  }
}

export async function markWarningAsRead(params: MarkWarningAsReadParams) {
  try {
    await connectToDatabase()

    const { warningId, userId } = params

    const warning = await Warning.findOneAndUpdate(
      { _id: warningId, user: userId },
      {
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    )

    if (!warning) {
      return { error: "Warning not found or unauthorized" }
    }

    return { success: true, warning }
  } catch (error) {
    console.error("Error marking warning as read:", error)
    return { error: "Failed to mark warning as read" }
  }
}

export async function deleteQuestionWithWarning(params: DeleteQuestionWithWarningParams) {
  try {
    await connectToDatabase()

    const { questionId, moderatorId, reason, message, path } = params

    // Get question and author
    const question = await Question.findById(questionId).populate('author')
    if (!question) {
      return { error: "Question not found" }
    }

    const authorId = (question.author as any)._id.toString()

    // Delete the question and related data
    await Question.deleteOne({ _id: questionId })
    await Answer.deleteMany({ question: questionId })
    await Interaction.deleteMany({ question: questionId })
    await Tag.updateMany({ questions: questionId }, { $pull: { questions: questionId } })

    // Reduce author reputation
    await User.findByIdAndUpdate(authorId, { $inc: { reputation: -7 } })

    // Create warning for the author
    const warningResult = await createWarning({
      userId: authorId,
      moderatorId,
      questionId,
      reason,
      message
    })

    if (warningResult.error) {
      console.error("Failed to create warning:", warningResult.error)
      // Continue even if warning creation fails
    }

    revalidatePath(path)
    return { success: true, warning: warningResult.warning }
  } catch (error) {
    console.error("Error deleting question with warning:", error)
    return { error: "Failed to delete question and create warning" }
  }
}

export async function deleteAnswerWithWarning(params: DeleteAnswerWithWarningParams) {
  try {
    await connectToDatabase()

    const { answerId, moderatorId, reason, message, path } = params

    // Get answer and author
    const answer = await Answer.findById(answerId).populate('author').populate('question', '_id')
    if (!answer) {
      return { error: "Answer not found" }
    }

    const authorId = (answer.author as any)._id.toString()
    const questionId = (answer.question as any)?._id?.toString()

    // Delete the answer and related data
    await Answer.deleteOne({ _id: answerId })
    await Question.updateMany({ _id: questionId }, { $pull: { answers: answerId } })
    await Interaction.deleteMany({ answer: answerId })
    await Comment.deleteMany({ answer: answerId })

    // Reduce author reputation
    await User.findByIdAndUpdate(authorId, { $inc: { reputation: -5 } })

    // Create warning for the author
    const warningResult = await createWarning({
      userId: authorId,
      moderatorId,
      questionId: questionId || undefined,
      reason,
      message
    })

    if (warningResult.error) {
      console.error("Failed to create warning:", warningResult.error)
    }

    revalidatePath(path)
    return { success: true, warning: warningResult.warning }
  } catch (error) {
    console.error("Error deleting answer with warning:", error)
    return { error: "Failed to delete answer and create warning" }
  }
}

export async function deleteCommentWithWarning(params: DeleteCommentWithWarningParams) {
  try {
    await connectToDatabase()

    const { commentId, moderatorId, reason, message, path } = params

    // Get comment and author
    const comment = await Comment.findById(commentId).populate('author').populate({
      path: 'answer',
      populate: { path: 'question', select: '_id' }
    })
    if (!comment) {
      return { error: "Comment not found" }
    }

    const authorId = (comment.author as any)._id.toString()
    const questionId = (comment.answer as any)?.question?._id?.toString()

    // Delete the comment
    await Comment.deleteOne({ _id: commentId })

    // Reduce author reputation
    await User.findByIdAndUpdate(authorId, { $inc: { reputation: -3 } })

    // Create warning for the author
    const warningResult = await createWarning({
      userId: authorId,
      moderatorId,
      questionId: questionId || undefined,
      reason,
      message
    })

    if (warningResult.error) {
      console.error("Failed to create warning:", warningResult.error)
    }

    revalidatePath(path)
    return { success: true, warning: warningResult.warning }
  } catch (error) {
    console.error("Error deleting comment with warning:", error)
    return { error: "Failed to delete comment and create warning" }
  }
}
