import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sendMessage, getMessages } from '@/lib/actions/chat.action';
import { getUserById } from '@/lib/actions/user.action';
import { triggerPusherEvent } from '@/lib/pusher-channels';
import { validateAndSanitizeBody } from '@/lib/middleware/validation';
import { z } from 'zod';
import { commonSchemas } from '@/lib/middleware/validation';

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000, 'Message content must be less than 5000 characters'),
  chatGroupId: commonSchemas.id,
});

export async function POST(req: NextRequest) {
  try {
    // Set timeout for the request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const { userId } = await auth();
      
      if (!userId) {
        clearTimeout(timeoutId);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Validate and sanitize request body
      const validation = await validateAndSanitizeBody(req, sendMessageSchema);
      if (validation instanceof NextResponse) {
        clearTimeout(timeoutId);
        return validation;
      }

      const { content, chatGroupId } = validation.data;

      // Get user from database
      const user = await getUserById({ userId });
      if (!user) {
        clearTimeout(timeoutId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const message = await sendMessage({
        content,
        authorId: user._id.toString(),
        chatGroupId,
        path: '/chat',
      });

      // Broadcast message via Pusher Channels
      // Ensure all ObjectIds are converted to strings
      const messageData = {
        _id: typeof message._id === 'object' && message._id !== null ? String(message._id) : message._id,
        content: message.content,
        author: typeof message.author === 'object' && message.author !== null 
          ? (typeof message.author._id === 'object' 
            ? { ...message.author, _id: String(message.author._id) }
            : message.author)
          : message.author,
        chatGroup: typeof message.chatGroup === 'object' && message.chatGroup !== null 
          ? String(message.chatGroup) 
          : message.chatGroup,
        createdAt: message.createdAt instanceof Date 
          ? message.createdAt.toISOString() 
          : message.createdAt,
      };

      const triggerResult = await triggerPusherEvent({
        channel: `chat-group-${chatGroupId}`,
        event: 'new-message',
        data: { message: messageData },
      });

      if (!triggerResult.ok) {
        console.error('[Channels] Failed to trigger message event:', triggerResult.reason);
        // Continue even if Pusher fails
      }

      clearTimeout(timeoutId);
      return NextResponse.json(message, { status: 201 });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 408 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chatGroupId = searchParams.get('chatGroupId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50')));

    if (!chatGroupId || !/^[a-f\d]{24}$/i.test(chatGroupId)) {
      return NextResponse.json({ error: 'Valid chatGroupId is required' }, { status: 400 });
    }

    const result = await getMessages({
      chatGroupId,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting messages:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

