import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongoose';
import SupportRequest from '@/database/supportRequest.model';
import { getUserById } from '@/lib/actions/user.action';

// POST - Create a new support request
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { subject, category, message } = body;

    // Validate input
    if (!subject || !message) {
      return NextResponse.json(
        { error: 'Subject and message are required' },
        { status: 400 }
      );
    }

    if (subject.length > 200) {
      return NextResponse.json(
        { error: 'Subject must be 200 characters or less' },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'Message must be 5000 characters or less' },
        { status: 400 }
      );
    }

    const validCategories = ['general', 'account', 'technical', 'content', 'billing', 'other'];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
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

    // Create support request
    const supportRequest = await SupportRequest.create({
      userId: user._id,
      clerkId: userId,
      subject: subject.trim(),
      category: category || 'general',
      message: message.trim(),
      status: 'pending',
    });

    return NextResponse.json(
      {
        message: 'Support request submitted successfully',
        supportRequest: {
          _id: supportRequest._id.toString(),
          subject: supportRequest.subject,
          category: supportRequest.category,
          status: supportRequest.status,
          createdAt: supportRequest.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating support request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get support requests (admin only)
export async function GET(req: NextRequest) {
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

    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    // Build query
    const query: any = {};
    if (status && ['pending', 'in_progress', 'resolved', 'closed'].includes(status)) {
      query.status = status;
    }
    if (category && ['general', 'account', 'technical', 'content', 'billing', 'other'].includes(category)) {
      query.category = category;
    }

    // Calculate pagination
    const skip = (page - 1) * pageSize;

    // Get support requests with user information
    const supportRequests = await SupportRequest.find(query)
      .populate('userId', 'name username email picture')
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
        userId: req.userId,
        clerkId: req.clerkId,
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
    console.error('Error fetching support requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
