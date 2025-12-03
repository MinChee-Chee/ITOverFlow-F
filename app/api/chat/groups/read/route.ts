import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongoose';
import ChatGroupRead from '@/database/chatGroupRead.model';
import ChatGroup from '@/database/chatGroup.model';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json().catch(() => null);
    const chatGroupId = body?.chatGroupId as string | undefined;

    if (!chatGroupId || !/^[a-f\d]{24}$/i.test(chatGroupId)) {
      return NextResponse.json(
        { error: 'Valid chatGroupId is required' },
        { status: 400 },
      );
    }

    // Ensure chat group exists
    const chatGroup = await ChatGroup.findById(chatGroupId)
      .select('_id')
      .lean();

    if (!chatGroup) {
      return NextResponse.json(
        { error: 'Chat group not found' },
        { status: 404 },
      );
    }

    // Resolve the user's database ID lazily
    const { getUserById } = await import('@/lib/actions/user.action');
    const user = await getUserById({ userId });

    if (!user?._id) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }

    await ChatGroupRead.findOneAndUpdate(
      { user: user._id, chatGroup: chatGroupId },
      { lastReadAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking chat group as read:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}


