import Pusher from 'pusher';

// ============================================================================
// SERVER-SIDE PUSHER CHANNELS INTEGRATION
// ============================================================================

const appId = process.env.PUSHER_APP_ID;
const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || process.env.PUSHER_CLUSTER || 'ap1';

// Verify no secrets are exposed to client
if (typeof window !== 'undefined') {
  throw new Error('pusher-channels.ts must only be imported server-side');
}

let pusherInstance: Pusher | null = null;

function getPusherInstance(): Pusher | null {
  if (!appId || !key || !secret) {
    console.warn('[Channels] Missing credentials:', {
      hasAppId: !!appId,
      hasKey: !!key,
      hasSecret: !!secret,
    });
    return null;
  }

  if (!pusherInstance) {
    console.info('[Channels] Initializing server instance:', {
      appId,
      keyPrefix: key.substring(0, 10) + '...',
      secretPrefix: secret.substring(0, 10) + '...',
      cluster,
      useTLS: true,
    });
    
    pusherInstance = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
  }

  return pusherInstance;
}

type TriggerParams = {
  channel: string;
  event: string;
  data: Record<string, any>;
};

type TriggerResult =
  | { ok: true; payloadSize?: number }
  | { ok: false; reason: string; status?: number };

export async function triggerPusherEvent({
  channel,
  event,
  data,
}: TriggerParams): Promise<TriggerResult> {
  const pusher = getPusherInstance();

  if (!pusher) {
    const reason = "Pusher Channels credentials are missing. Skipping trigger.";
    console.warn('[Channels]', reason);
    return { ok: false, reason };
  }

  // Validate channel name format (Pusher allows: a-z, A-Z, 0-9, _, -, =, @, ., :, and no spaces)
  const channelPattern = /^[a-zA-Z0-9_\-=@.:]+$/;
  if (!channelPattern.test(channel)) {
    const reason = `Invalid channel name format: ${channel}`;
    console.error('[Channels]', reason);
    return { ok: false, reason };
  }

  // Calculate payload size for diagnostics
  const payloadSize = JSON.stringify(data).length;
  const payloadSizeKB = (payloadSize / 1024).toFixed(2);

  console.info('[Channels] Triggering event:', {
    channel,
    event,
    payloadSize: `${payloadSizeKB} KB`,
    timestamp: new Date().toISOString(),
  });

  try {
    await pusher.trigger(channel, event, data);
    console.info('[Channels] Trigger succeeded:', {
      channel,
      event,
      payloadSize: `${payloadSizeKB} KB`,
      timestamp: new Date().toISOString(),
    });
    return { ok: true, payloadSize };
  } catch (error) {
    const pusherError = error as any;
    const errorDetails = {
      channel,
      event,
      message: (error as Error).message,
      status: pusherError?.status,
      body: pusherError?.body,
      url: pusherError?.url,
      timestamp: new Date().toISOString(),
    };
    console.error('[Channels] Trigger failed:', errorDetails);
    return { 
      ok: false, 
      reason: (error as Error).message,
      status: pusherError?.status,
    };
  }
}

