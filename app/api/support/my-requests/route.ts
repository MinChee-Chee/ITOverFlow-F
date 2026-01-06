import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongoose';
import SupportRequest from '@/database/supportRequest.model';
import { getUserById } from '@/lib/actions/user.action';

// GET - Get current user's support requests
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Get user from database
    const user = await getUserById({ userId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    // Build query - only get requests from this user
    const query: any = { userId: user._id };
    if (status && ['pending', 'in_progress', 'resolved', 'closed'].includes(status)) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (page - 1) * pageSize;

    // Get support requests
    const supportRequests = await SupportRequest.find(query)
      .populate('respondedBy', 'name username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean() as any[];

    // Get total count
    const total = await SupportRequest.countDocuments(query);

    return NextResponse.json({
      supportRequests: supportRequests.map((req) => ({
        _id: String(req._id),
        subject: req.subject,
        category: req.category,
        message: req.message,
        status: req.status,
        adminResponse: req.adminResponse,
        respondedBy: req.respondedBy,
        respondedAt: req.respondedAt,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: skip + pageSize < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching user support requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
