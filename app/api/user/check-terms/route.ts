import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserById } from '@/lib/actions/user.action';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { termsAccepted: false },
        { status: 200 }
      );
    }

    // Get user from database
    const user = await getUserById({ userId });
    if (!user) {
      return NextResponse.json(
        { termsAccepted: false },
        { status: 200 }
      );
    }

    // Explicitly return boolean - only true if explicitly set to true
    const termsAccepted = user.termsAccepted === true
    
    return NextResponse.json({
      termsAccepted,
      termsAcceptedAt: user.termsAcceptedAt?.toISOString(),
    });
  } catch (error) {
    console.error('Error checking terms:', error);
    return NextResponse.json(
      { termsAccepted: false },
      { status: 200 }
    );
  }
}
