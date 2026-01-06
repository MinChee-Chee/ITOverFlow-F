import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isUserBannedFromChatGroup } from '@/lib/actions/chat.action';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const chatGroupId = searchParams.get('chatGroupId');

    if (!chatGroupId) {
      return NextResponse.json(
        { error: 'chatGroupId is required' },
        { status: 400 }
      );
    }

    // Get user from database to get MongoDB _id
    const { getUserById } = await import('@/lib/actions/user.action');
    const user = await getUserById({ userId });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check ban status
    const banStatus = await isUserBannedFromChatGroup(chatGroupId, user._id);

    return NextResponse.json({
      banStatus: {
        banned: banStatus.banned,
        expiresAt: banStatus.expiresAt?.toISOString(),
        bannedAt: banStatus.bannedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error checking ban status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
