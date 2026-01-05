import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { markWarningAsRead } from '@/lib/actions/warning.action'
import { getUserById } from '@/lib/actions/user.action'

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

    const user = await getUserById({ userId })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const resolvedParams = await params
    const result = await markWarningAsRead({
      warningId: resolvedParams.id,
      userId: user._id.toString()
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Warning marked as read', warning: result.warning },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in PATCH /api/warnings/[id]/read:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
