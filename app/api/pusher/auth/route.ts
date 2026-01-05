import { NextRequest, NextResponse } from 'next/server';
import { auth as clerkAuth } from '@clerk/nextjs/server';
import crypto from 'crypto';

const appId = process.env.PUSHER_APP_ID;
const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await clerkAuth();
    
    if (!userId) {
      console.warn('[Channels Auth] Unauthorized: No userId');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!appId || !key || !secret) {
      console.error('[Channels Auth] Missing credentials:', {
        hasAppId: !!appId,
        hasKey: !!key,
        hasSecret: !!secret,
      });
      return NextResponse.json(
        { error: 'Pusher credentials not configured' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { socket_id, channel_name } = body;

    if (!socket_id || !channel_name) {
      console.warn('[Channels Auth] Missing required fields:', {
        hasSocketId: !!socket_id,
        hasChannelName: !!channel_name,
      });
      return NextResponse.json({ error: 'socket_id and channel_name are required' }, { status: 400 });
    }

    // Validate channel name format
    const channelPattern = /^[a-zA-Z0-9_\-=@.:]+$/;
    if (!channelPattern.test(channel_name)) {
      console.error('[Channels Auth] Invalid channel name:', channel_name);
      return NextResponse.json({ error: 'Invalid channel name format' }, { status: 400 });
    }

    // Generate auth signature for Pusher Channels
    const stringToSign = `${socket_id}:${channel_name}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(stringToSign)
      .digest('hex');

    const authResponse: {
      auth: string;
      channel_data?: string;
    } = {
      auth: `${key}:${signature}`,
    };

    // For presence channels, include channel_data
    if (channel_name.startsWith('presence-')) {
      const channelData = JSON.stringify({
        user_id: userId,
        user_info: {
          name: userId,
        },
      });
      authResponse.channel_data = channelData;
      console.info('[Channels Auth] Presence channel authorized:', {
        channel: channel_name,
        userId,
        timestamp: new Date().toISOString(),
      });
    } else {
      // For public channels, auth is still called but channel_data not needed
      console.info('[Channels Auth] Public channel authorized:', {
        channel: channel_name,
        userId,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('[Channels Auth] Error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

