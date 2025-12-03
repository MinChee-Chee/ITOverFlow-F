import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getChatGroupById, joinChatGroup, updateChatGroup, deleteChatGroup } from '@/lib/actions/chat.action';
import { getUserById } from '@/lib/actions/user.action';
import { checkRole } from '@/utlis/roles';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const chatGroup = await getChatGroupById(id);
    return NextResponse.json(chatGroup);
  } catch (error) {
    console.error('Error getting chat group:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    // Get user from database
    const user = await getUserById({ userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const chatGroup = await joinChatGroup({
      chatGroupId: id,
      userId: user._id.toString(),
      path: '/chat',
    });

    return NextResponse.json(chatGroup);
  } catch (error) {
    console.error('Error joining chat group:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is moderator or admin
    const isModerator = await checkRole('moderator');
    const isAdmin = await checkRole('admin');
    
    if (!isModerator && !isAdmin) {
      return NextResponse.json({ error: 'Only moderators can update chat groups' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, tags } = body;

    if (!name || !tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json({ error: 'Name and at least one tag are required' }, { status: 400 });
    }

    // Verify the chat group exists and user is the moderator
    const existingGroup = await getChatGroupById(id);
    if (!existingGroup) {
      return NextResponse.json({ error: 'Chat group not found' }, { status: 404 });
    }

    // Get user from database
    const user = await getUserById({ userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only allow moderator of the group or admin to update
    if (existingGroup.moderator._id.toString() !== user._id.toString() && !isAdmin) {
      return NextResponse.json({ error: 'You can only update your own chat groups' }, { status: 403 });
    }

    const chatGroup = await updateChatGroup({
      chatGroupId: id,
      name,
      description,
      tags,
      path: '/moderator',
    });

    return NextResponse.json(chatGroup);
  } catch (error) {
    console.error('Error updating chat group:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is moderator or admin
    const isModerator = await checkRole('moderator');
    const isAdmin = await checkRole('admin');
    
    if (!isModerator && !isAdmin) {
      return NextResponse.json({ error: 'Only moderators can delete chat groups' }, { status: 403 });
    }

    const { id } = await params;

    // Verify the chat group exists and user is the moderator
    const existingGroup = await getChatGroupById(id);
    if (!existingGroup) {
      return NextResponse.json({ error: 'Chat group not found' }, { status: 404 });
    }

    // Get user from database
    const user = await getUserById({ userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only allow moderator of the group or admin to delete
    if (existingGroup.moderator._id.toString() !== user._id.toString() && !isAdmin) {
      return NextResponse.json({ error: 'You can only delete your own chat groups' }, { status: 403 });
    }

    await deleteChatGroup({
      chatGroupId: id,
      path: '/moderator',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat group:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

