import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { banUserFromChatGroup, getChatGroupById } from '@/lib/actions/chat.action';
import { getUserById } from '@/lib/actions/user.action';
import { checkRole } from '@/utlis/roles';
import { triggerPusherEvent } from '@/lib/pusher-channels';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { chatGroupId, bannedUserId } = body;

    if (!chatGroupId || !bannedUserId) {
      return NextResponse.json(
        { error: 'Chat group ID and user ID are required' },
        { status: 400 }
      );
    }

    // Get moderator from database
    const moderator = await getUserById({ userId });
    if (!moderator) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is moderator or admin
    const [isModerator, isAdmin] = await Promise.all([
      checkRole('moderator'),
      checkRole('admin'),
    ]);

    if (!isModerator && !isAdmin) {
      return NextResponse.json(
        { error: 'Only moderators and admins can ban users from chat groups' },
        { status: 403 }
      );
    }

    // Check if trying to ban the group moderator (only admins can do this)
    // Get the chat group to check its moderator
    let chatGroup;
    try {
      chatGroup = await getChatGroupById(chatGroupId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Chat group not found' },
        { status: 404 }
      );
    }

    // Check if the user being banned is the group moderator
    // Extract moderator ID (could be ObjectId or populated object)
    let groupModeratorId: string;
    if (typeof chatGroup.moderator === 'object' && chatGroup.moderator !== null) {
      if ('_id' in chatGroup.moderator) {
        groupModeratorId = String(chatGroup.moderator._id);
      } else {
        // If it's an ObjectId-like object, convert to string
        groupModeratorId = String(chatGroup.moderator);
      }
    } else {
      groupModeratorId = String(chatGroup.moderator || '');
    }

    // bannedUserId is already the MongoDB _id
    if (groupModeratorId === bannedUserId && !isAdmin) {
      return NextResponse.json(
        { error: 'Cannot ban the group moderator. Only admins can ban group moderators.' },
        { status: 403 }
      );
    }

    const result = await banUserFromChatGroup({
      chatGroupId,
      userId: bannedUserId,
      moderatorId: moderator._id.toString(),
      path: '/chat',
    });

    // Broadcast ban event and message deletions via Pusher
    if (result.messageIds && result.messageIds.length > 0) {
      // Broadcast each message deletion
      for (const messageId of result.messageIds) {
        await triggerPusherEvent({
          channel: `chat-group-${chatGroupId}`,
          event: 'message-deleted',
          data: { messageId },
        });
      }
    }

    // Broadcast user banned event
    await triggerPusherEvent({
      channel: `chat-group-${chatGroupId}`,
      event: 'user-banned',
      data: { 
        userId: bannedUserId,
        expiresAt: result.banExpiresAt,
      },
    });

    return NextResponse.json(
      { 
        message: 'User banned successfully from chat group. All their messages have been deleted.',
        chatGroup: result 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error banning user from chat group:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
