import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongoose';
import SupportRequest from '@/database/supportRequest.model';
import { getUserById } from '@/lib/actions/user.action';

// PATCH - Update support request (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { checkRole } = await import('@/utlis/roles');
    const isAdmin = await checkRole('admin');

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { adminResponse, status } = body;

    await connectToDatabase();

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Validate response length
    if (adminResponse && adminResponse.length > 5000) {
      return NextResponse.json(
        { error: 'Response must be 5000 characters or less' },
        { status: 400 }
      );
    }

    // Get admin user
    const adminUser = await getUserById({ userId });
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (status) {
      updateData.status = status;
    }
    if (adminResponse !== undefined) {
      if (adminResponse.trim()) {
        updateData.adminResponse = adminResponse.trim();
        updateData.respondedBy = adminUser._id;
        updateData.respondedAt = new Date();
      } else {
        // If empty response, clear it
        updateData.adminResponse = undefined;
        updateData.respondedBy = undefined;
        updateData.respondedAt = undefined;
      }
    }

    // Update support request
    const supportRequest = await SupportRequest.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
      .populate('userId', 'name username email picture')
      .populate('respondedBy', 'name username')
      .lean() as any;

    if (!supportRequest) {
      return NextResponse.json(
        { error: 'Support request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Support request updated successfully',
      supportRequest: {
        _id: String(supportRequest._id),
        userId: supportRequest.userId,
        clerkId: supportRequest.clerkId,
        subject: supportRequest.subject,
        category: supportRequest.category,
        message: supportRequest.message,
        status: supportRequest.status,
        adminResponse: supportRequest.adminResponse,
        respondedBy: supportRequest.respondedBy,
        respondedAt: supportRequest.respondedAt,
        createdAt: supportRequest.createdAt,
        updatedAt: supportRequest.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating support request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get single support request (admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { checkRole } = await import('@/utlis/roles');
    const isAdmin = await checkRole('admin');

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;

    await connectToDatabase();

    const supportRequest = await SupportRequest.findById(id)
      .populate('userId', 'name username email picture')
      .populate('respondedBy', 'name username')
      .lean() as any;

    if (!supportRequest) {
      return NextResponse.json(
        { error: 'Support request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      supportRequest: {
        _id: String(supportRequest._id),
        userId: supportRequest.userId,
        clerkId: supportRequest.clerkId,
        subject: supportRequest.subject,
        category: supportRequest.category,
        message: supportRequest.message,
        status: supportRequest.status,
        adminResponse: supportRequest.adminResponse,
        respondedBy: supportRequest.respondedBy,
        respondedAt: supportRequest.respondedAt,
        createdAt: supportRequest.createdAt,
        updatedAt: supportRequest.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching support request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
