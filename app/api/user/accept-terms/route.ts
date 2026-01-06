import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserById, updateUser } from '@/lib/actions/user.action';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await getUserById({ userId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user to accept terms
    const updatedUser = await updateUser({
      clerkId: userId,
      updateData: {
        termsAccepted: true,
        termsAcceptedAt: new Date(),
      },
      path: '/',
    });

    // Verify the update was successful
    if (!updatedUser) {
      console.error('[accept-terms] updateUser returned null/undefined')
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }

    // Check the returned value directly
    const termsAccepted = updatedUser.termsAccepted === true
    const termsAcceptedAt = updatedUser.termsAcceptedAt

    // If termsAccepted is not true, the update didn't work
    if (!termsAccepted) {
      return NextResponse.json(
        { 
          error: 'Terms acceptance was not saved. Please try again.',
          termsAccepted: false,
        },
        { status: 500 }
      )
    }

    // Success - return the confirmed values
    return NextResponse.json(
      { 
        message: 'Terms accepted successfully',
        termsAccepted: true,
        termsAcceptedAt: termsAcceptedAt?.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error accepting terms:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
