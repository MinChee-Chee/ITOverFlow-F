import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { updateReportStatus } from '@/lib/actions/report.action'
import { getUserById } from '@/lib/actions/user.action'
import { checkRole } from '@/utlis/roles'

export async function PATCH(
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
        { error: 'Only moderators and admins can update report status' },
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const body = await req.json()
    const { status } = body

    if (!status || !['reviewed', 'resolved', 'dismissed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be reviewed, resolved, or dismissed' },
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

    const result = await updateReportStatus({
      reportId: resolvedParams.id,
      status,
      reviewedBy: user._id.toString(),
      path: '/moderator/reports'
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Report status updated successfully', report: result.report },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in PATCH /api/reports/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
