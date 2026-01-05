import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkRole } from '@/utlis/roles';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ isModerator: false, isAdmin: false }, { status: 200 });
    }

    // Check both roles in parallel for better performance
    const [isModerator, isAdmin] = await Promise.all([
      checkRole('moderator'),
      checkRole('admin')
    ]);

    return NextResponse.json({ isModerator, isAdmin }, { status: 200 });
  } catch (error) {
    console.error('Error checking role:', error);
    // Return 200 with false values to prevent UI errors, but log the issue
    return NextResponse.json({ isModerator: false, isAdmin: false }, { status: 200 });
  }
}

