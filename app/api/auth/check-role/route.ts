import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkRole } from '@/utlis/roles';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ isModerator: false, isAdmin: false });
    }

    const isModerator = await checkRole('moderator');
    const isAdmin = await checkRole('admin');

    return NextResponse.json({ isModerator, isAdmin });
  } catch (error) {
    console.error('Error checking role:', error);
    return NextResponse.json({ isModerator: false, isAdmin: false });
  }
}

