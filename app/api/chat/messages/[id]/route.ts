import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { deleteMessage } from '@/lib/actions/chat.action';
import { getUserById } from '@/lib/actions/user.action';
import { triggerPusherEvent } from '@/lib/pusher-channels';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    let messageId = resolvedParams.id;

    if (!messageId) {
      return NextResponse.json({ error: 'Valid message ID is required' }, { status: 400 });
    }

    // Ensure messageId is a string
    messageId = String(messageId).trim();

    // Validate MongoDB ObjectId format (24 hex characters)
    if (!/^[a-f\d]{24}$/i.test(messageId)) {
      return NextResponse.json({ 
        error: 'Valid message ID is required',
        details: `Invalid ID format: ${messageId.substring(0, 50)} (length: ${messageId.length})`
      }, { status: 400 });
    }

    // Get user from database
    const user = await getUserById({ userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete the message (this will verify ownership and return chatGroupId)
    const result = await deleteMessage({
      messageId,
      userId: user._id.toString(),
      path: '/chat',
    });

    // Broadcast deletion via Pusher Channels
    if (result.chatGroupId) {
      const triggerResult = await triggerPusherEvent({
        channel: `chat-group-${result.chatGroupId}`,
        event: 'message-deleted',
        data: { messageId },
      });

      if (!triggerResult.ok) {
        console.error('[Channels] Failed to trigger message deletion event:', triggerResult.reason);
        // Continue even if Pusher fails
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
