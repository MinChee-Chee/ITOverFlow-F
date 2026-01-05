import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createReport } from '@/lib/actions/report.action'
import { getUserById } from '@/lib/actions/user.action'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to report a question.' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { type, questionId, answerId, commentId, reason } = body

    if (!type || !reason) {
      return NextResponse.json(
        { error: 'Report type and reason are required' },
        { status: 400 }
      )
    }

    if (!['question', 'answer', 'comment'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid report type. Must be question, answer, or comment' },
        { status: 400 }
      )
    }

    // Validate that the appropriate ID is provided
    if (type === 'question' && !questionId) {
      return NextResponse.json(
        { error: 'Question ID is required for question reports' },
        { status: 400 }
      )
    }
    if (type === 'answer' && !answerId) {
      return NextResponse.json(
        { error: 'Answer ID is required for answer reports' },
        { status: 400 }
      )
    }
    if (type === 'comment' && !commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required for comment reports' },
        { status: 400 }
      )
    }

    // Get user from database
    const user = await getUserById({ userId })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Determine path based on type
    let path = '/'
    if (type === 'question' && questionId) {
      path = `/question/${questionId}`
    } else if (type === 'answer' && answerId) {
      // We'll need to get the question ID from the answer to build the path
      const Answer = (await import('@/database/answer.model')).default
      const answer = await Answer.findById(answerId).populate('question', '_id')
      if (answer && (answer as any).question) {
        path = `/question/${(answer as any).question._id}`
      }
    } else if (type === 'comment' && commentId) {
      // We'll need to get the question ID from the comment's answer
      const Comment = (await import('@/database/comment.model')).default
      const comment = await Comment.findById(commentId).populate({
        path: 'answer',
        populate: { path: 'question', select: '_id' }
      })
      if (comment && (comment as any).answer && (comment as any).answer.question) {
        path = `/question/${(comment as any).answer.question._id}`
      }
    }

    const result = await createReport({
      type: type as 'question' | 'answer' | 'comment',
      questionId,
      answerId,
      commentId,
      reporterId: user._id.toString(),
      reason,
      path
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Report submitted successfully', report: result.report },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/reports:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
