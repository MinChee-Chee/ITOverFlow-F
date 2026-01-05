import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { deleteQuestionWithWarning } from '@/lib/actions/warning.action'
import { getUserById } from '@/lib/actions/user.action'
import { checkRole } from '@/utlis/roles'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is moderator or admin
    const isModerator = await checkRole('moderator')
    const isAdmin = await checkRole('admin')

    if (!isModerator && !isAdmin) {
      return NextResponse.json(
        { error: 'Only moderators and admins can delete questions with warnings' },
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const body = await req.json()
    const { reason, message } = body

    if (!reason || !message) {
      return NextResponse.json(
        { error: 'Reason and message are required' },
        { status: 400 }
      )
    }

    // Get moderator from database
    const moderator = await getUserById({ userId })
    if (!moderator) {
      return NextResponse.json(
        { error: 'Moderator not found' },
        { status: 404 }
      )
    }

    const result = await deleteQuestionWithWarning({
      questionId: resolvedParams.id,
      moderatorId: moderator._id.toString(),
      reason: reason.trim(),
      message: message.trim(),
      path: '/moderator/reports'
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Question deleted and warning sent successfully', warning: result.warning },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in POST /api/questions/[id]/delete-with-warning:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
