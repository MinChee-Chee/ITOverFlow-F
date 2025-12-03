import Pusher from 'pusher';

const appId = process.env.PUSHER_APP_ID;
const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;
// Ensure cluster is set correctly - default to ap1 if not specified
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || process.env.PUSHER_CLUSTER || 'ap1';

// Initialize Pusher instance (singleton pattern)
let pusherInstance: Pusher | null = null;

function getPusherInstance(): Pusher | null {
  if (!appId || !key || !secret) {
    return null;
  }

  if (!pusherInstance) {
    // Log first 10 chars of each for debugging (don't log full secrets)
    console.info('[Channels] Initializing Pusher with:', {
      appId,
      keyPrefix: key.substring(0, 10) + '...',
      secretPrefix: secret.substring(0, 10) + '...',
      cluster,
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
  | { ok: true }
  | { ok: false; reason: string; status?: number };

export async function triggerPusherEvent({
  channel,
  event,
  data,
}: TriggerParams): Promise<TriggerResult> {
  const pusher = getPusherInstance();

  if (!pusher) {
    const reason = "Pusher Channels credentials are missing. Skipping trigger.";
    console.warn(reason);
    return { ok: false, reason };
  }

  console.info("[Channels] Triggering event", {
    channel,
    event,
  });

  try {
    await pusher.trigger(channel, event, data);
    console.info("[Channels] Trigger succeeded", { channel, event });
    return { ok: true };
  } catch (error) {
    const pusherError = error as any;
    console.error("[Channels] Trigger threw", {
      message: (error as Error).message,
      status: pusherError?.status,
      body: pusherError?.body,
      url: pusherError?.url,
    });
    return { 
      ok: false, 
      reason: (error as Error).message,
      status: pusherError?.status,
    };
  }
}

