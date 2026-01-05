import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getWarnings } from '@/lib/actions/warning.action'
import { getUserById } from '@/lib/actions/user.action'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { warnings: [], unreadCount: 0 },
        { status: 200 }
      )
    }

    const user = await getUserById({ userId })
    if (!user) {
      return NextResponse.json(
        { warnings: [], unreadCount: 0 },
        { status: 200 }
      )
    }

    const result = await getWarnings({
      userId: user._id.toString(),
      includeRead: true 
    })

    // Add cache control headers to prevent caching
    return NextResponse.json(result, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error('Error in GET /api/warnings:', error)
    return NextResponse.json(
      { warnings: [], unreadCount: 0 },
      { status: 200 }
    )
  }
}
