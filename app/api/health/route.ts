import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';

export async function GET() {
  try {
    // Check database connection
    await connectToDatabase();
    
    return NextResponse.json(
      { 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}


