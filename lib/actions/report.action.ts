"use server"

import { connectToDatabase } from "../mongoose"
import Report from "@/database/report.model"
import Question from "@/database/question.model"
import User from "@/database/user.model"
import { revalidatePath } from "next/cache"
import { CreateReportParams, GetReportsParams, UpdateReportStatusParams } from "./shared.types"
import { escapeRegex } from "../utils"
import { FilterQuery } from "mongoose"

export async function createReport(params: CreateReportParams) {
  try {
    await connectToDatabase()

    const { type, questionId, answerId, commentId, chatMessageId, reporterId, reason, path } = params

    // Build query based on type
    let query: any = {
      reporter: reporterId,
      status: 'pending'
    }

    if (type === 'question' && questionId) {
      query.question = questionId
    } else if (type === 'answer' && answerId) {
      query.answer = answerId
    } else if (type === 'comment' && commentId) {
      query.comment = commentId
    } else if (type === 'chatMessage' && chatMessageId) {
      query.chatMessage = chatMessageId
    } else {
      return { error: "Invalid report type or missing ID" }
    }

    // Check if user already reported this content
    const existingReport = await Report.findOne(query)

    if (existingReport) {
      const contentType = type === 'question' ? 'question' : type === 'answer' ? 'answer' : type === 'comment' ? 'comment' : 'chat message'
      return { error: `You have already reported this ${contentType}. Please wait for moderator review.` }
    }

    // Verify content exists
    if (type === 'question' && questionId) {
      const question = await Question.findById(questionId)
      if (!question) {
        return { error: "Question not found" }
      }
    } else if (type === 'answer' && answerId) {
      const Answer = (await import('@/database/answer.model')).default
      const answer = await Answer.findById(answerId)
      if (!answer) {
        return { error: "Answer not found" }
      }
    } else if (type === 'comment' && commentId) {
      const Comment = (await import('@/database/comment.model')).default
      const comment = await Comment.findById(commentId)
      if (!comment) {
        return { error: "Comment not found" }
      }
    } else if (type === 'chatMessage' && chatMessageId) {
      const ChatMessage = (await import('@/database/chatMessage.model')).default
      const chatMessage = await ChatMessage.findById(chatMessageId)
      if (!chatMessage) {
        return { error: "Chat message not found" }
      }
    }

    // Create report - only include the relevant content field based on type
    const reportData: any = {
      reporter: reporterId,
      type,
      reason: reason.trim(),
      status: 'pending'
    }

    // Only set the field that matches the type, leave others undefined
    if (type === 'question' && questionId) {
      reportData.question = questionId
      // Explicitly don't set answer, comment, or chatMessage
    } else if (type === 'answer' && answerId) {
      reportData.answer = answerId
      // Explicitly don't set question, comment, or chatMessage
    } else if (type === 'comment' && commentId) {
      reportData.comment = commentId
      // Explicitly don't set question, answer, or chatMessage
    } else if (type === 'chatMessage' && chatMessageId) {
      reportData.chatMessage = chatMessageId
      // Explicitly don't set question, answer, or comment
    }

    const report = await Report.create(reportData)

    revalidatePath(path)
    return { success: true, report }
  } catch (error) {
    console.error("Error creating report:", error)
    return { error: "Failed to create report. Please try again." }
  }
}

export async function getReports(params: GetReportsParams) {
  try {
    await connectToDatabase()

    const { page = 1, pageSize = 10, status, searchQuery } = params
    const skipAmount = (page - 1) * pageSize

    const query: FilterQuery<typeof Report> = {}

    if (status) {
      query.status = status
    }

    if (searchQuery) {
      const escapedQuery = escapeRegex(searchQuery)
      query.$or = [
        { reason: { $regex: new RegExp(escapedQuery, "i") } }
      ]
    }

    const Answer = (await import('@/database/answer.model')).default
    const Comment = (await import('@/database/comment.model')).default
    const ChatMessage = (await import('@/database/chatMessage.model')).default
    const ChatGroup = (await import('@/database/chatGroup.model')).default

    const reports = await Report.find(query)
      .populate({
        path: 'reporter',
        model: User,
        select: '_id clerkId name username picture',
        strictPopulate: false
      })
      .populate({
        path: 'question',
        model: Question,
        select: '_id title content createdAt author',
        strictPopulate: false,
        populate: {
          path: 'author',
          model: User,
          select: '_id clerkId name username picture',
          strictPopulate: false
        }
      })
      .populate({
        path: 'answer',
        model: Answer,
        select: '_id content createdAt author question',
        strictPopulate: false,
        populate: [
          {
            path: 'author',
            model: User,
            select: '_id clerkId name username picture',
            strictPopulate: false
          },
          {
            path: 'question',
            model: Question,
            select: '_id title',
            strictPopulate: false
          }
        ]
      })
      .populate({
        path: 'comment',
        model: Comment,
        select: '_id content createdAt author answer',
        strictPopulate: false,
        populate: [
          {
            path: 'author',
            model: User,
            select: '_id clerkId name username picture',
            strictPopulate: false
          },
          {
            path: 'answer',
            model: Answer,
            select: '_id content question',
            strictPopulate: false,
            populate: {
              path: 'question',
              model: Question,
              select: '_id title',
              strictPopulate: false
            }
          }
        ]
      })
      .populate({
        path: 'chatMessage',
        model: ChatMessage,
        select: '_id content createdAt author chatGroup',
        strictPopulate: false,
        populate: [
          {
            path: 'author',
            model: User,
            select: '_id clerkId name username picture',
            strictPopulate: false
          },
          {
            path: 'chatGroup',
            model: ChatGroup,
            select: '_id name',
            strictPopulate: false
          }
        ]
      })
      .populate({
        path: 'reviewedBy',
        model: User,
        select: '_id clerkId name username',
        strictPopulate: false
      })
      .sort({ createdAt: -1 })
      .skip(skipAmount)
      .limit(pageSize)

    const totalReports = await Report.countDocuments(query)
    const isNext = totalReports > skipAmount + reports.length

    return {
      reports: JSON.parse(JSON.stringify(reports)),
      isNext
    }
  } catch (error) {
    console.error("Error fetching reports:", error)
    return { reports: [], isNext: false }
  }
}

export async function updateReportStatus(params: UpdateReportStatusParams) {
  try {
    await connectToDatabase()

    const { reportId, status, reviewedBy, path } = params

    const report = await Report.findByIdAndUpdate(
      reportId,
      {
        status,
        reviewedBy,
        reviewedAt: new Date()
      },
      { new: true }
    )

    if (!report) {
      return { error: "Report not found" }
    }

    revalidatePath(path)
    return { success: true, report }
  } catch (error) {
    console.error("Error updating report status:", error)
    return { error: "Failed to update report status" }
  }
}

export async function getReportById(reportId: string) {
  try {
    await connectToDatabase()

    const report = await Report.findById(reportId)
      .populate({
        path: 'reporter',
        model: User,
        select: '_id clerkId name username picture'
      })
      .populate({
        path: 'question',
        model: Question,
        select: '_id title content createdAt author tags',
        populate: [
          {
            path: 'author',
            model: User,
            select: '_id clerkId name username picture'
          }
        ]
      })
      .populate({
        path: 'reviewedBy',
        model: User,
        select: '_id clerkId name username',
        strictPopulate: false
      })

    if (!report) {
      return { error: "Report not found" }
    }

    return { report: JSON.parse(JSON.stringify(report)) }
  } catch (error) {
    console.error("Error fetching report:", error)
    return { error: "Failed to fetch report" }
  }
}
