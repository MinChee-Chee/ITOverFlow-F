import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createChatGroup, getChatGroups } from '@/lib/actions/chat.action';
import { checkRole } from '@/utlis/roles';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parallel: check roles and parse body
    const [roleCheck, body] = await Promise.all([
      Promise.all([checkRole('moderator'), checkRole('admin')]),
      req.json().catch(() => null),
    ]);

    const [isModerator, isAdmin] = roleCheck;
    
    if (!isModerator && !isAdmin) {
      return NextResponse.json({ error: 'Only moderators can create chat groups' }, { status: 403 });
    }

    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { name, description, tags } = body;

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json({ error: 'At least one tag is required' }, { status: 400 });
    }

    if (tags.length > 4) {
      return NextResponse.json({ error: 'Maximum 4 tags allowed' }, { status: 400 });
    }

    // Get user from database to get the user ID
    const { getUserById } = await import('@/lib/actions/user.action');
    const user = await getUserById({ userId });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const chatGroup = await createChatGroup({
      name: name.trim(),
      description: description?.trim(),
      tags,
      moderatorId: user._id.toString(),
      path: '/chat',
    });

    return NextResponse.json(chatGroup, { status: 201 });
  } catch (error) {
    console.error('Error creating chat group:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await checkRole('admin');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can access chat groups' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tagId = searchParams.get('tagId') || undefined;
    const searchQuery = searchParams.get('searchQuery') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));

    let currentUserId: string | undefined;

    if (userId) {
      try {
        const { getUserById } = await import('@/lib/actions/user.action');
        const user = await getUserById({ userId });
        if (user?._id) {
          currentUserId = String(user._id);
        }
      } catch (error) {
        console.error('Error resolving current user for chat groups:', error);
      }
    }

    const result = await getChatGroups({
      tagId,
      searchQuery,
      page,
      pageSize,
      currentUserId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting chat groups:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

