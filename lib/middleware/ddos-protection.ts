import { NextRequest, NextResponse } from 'next/server';

interface RequestTracker {
  count: number;
  firstRequest: number;
  blocked: boolean;
  blockUntil: number;
}

// In-memory store for request tracking (use Redis in production)
const requestStore: Map<string, RequestTracker> = new Map();

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now();
  requestStore.forEach((tracker, key) => {
    if (tracker.blockUntil < now && tracker.count === 0) {
      requestStore.delete(key);
    }
  });
}, 60 * 1000);

export interface DDoSProtectionOptions {
  // Maximum requests per window
  maxRequests: number;
  // Time window in milliseconds
  windowMs: number;
  // Block duration in milliseconds after threshold exceeded
  blockDurationMs: number;
  // Maximum request size in bytes
  maxRequestSize?: number;
  // Allowed user agents (optional)
  allowedUserAgents?: string[];
  // Blocked IPs (optional)
  blockedIPs?: string[];
}

const defaultOptions: DDoSProtectionOptions = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  blockDurationMs: 15 * 60 * 1000, // 15 minutes
  maxRequestSize: 10 * 1024 * 1024, // 10MB
};

export function createDDoSProtection(options: Partial<DDoSProtectionOptions> = {}) {
  const config = { ...defaultOptions, ...options };

  return async (req: NextRequest): Promise<NextResponse | null> => {
    // Get client IP
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown';
    
    // If we can't reliably determine the IP, skip DDoS checks to avoid
    // accidentally blocking legitimate traffic (common in local/dev setups
    // or behind certain reverse proxies).
    if (ip === 'unknown') {
      return null;
    }
    
    // Check if IP is in blocked list
    if (config.blockedIPs?.includes(ip)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check user agent if configured
    const userAgent = req.headers.get('user-agent') || '';
    if (config.allowedUserAgents && !config.allowedUserAgents.some(ua => userAgent.includes(ua))) {
      // Only block if allowed list is provided and user agent doesn't match
      // This is optional and can be disabled
    }

    // Check request size
    const contentLength = req.headers.get('content-length');
    if (contentLength && config.maxRequestSize) {
      const size = parseInt(contentLength, 10);
      if (size > config.maxRequestSize) {
        return NextResponse.json(
          { error: 'Request too large' },
          { status: 413 }
        );
      }
    }

    // Get or create tracker
    let tracker = requestStore.get(ip);
    const now = Date.now();

    if (!tracker) {
      tracker = {
        count: 0,
        firstRequest: now,
        blocked: false,
        blockUntil: 0,
      };
      requestStore.set(ip, tracker);
    }

    // Check if currently blocked
    if (tracker.blocked && tracker.blockUntil > now) {
      const retryAfter = Math.ceil((tracker.blockUntil - now) / 1000);
      return NextResponse.json(
        { 
          error: 'Too many requests. Your IP has been temporarily blocked.',
          retryAfter 
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-Blocked-Until': new Date(tracker.blockUntil).toISOString(),
          },
        }
      );
    }

    // Reset if window expired
    if (now - tracker.firstRequest > config.windowMs) {
      tracker.count = 0;
      tracker.firstRequest = now;
      tracker.blocked = false;
    }

    // Increment request count
    tracker.count++;

    // Check if threshold exceeded
    if (tracker.count > config.maxRequests) {
      tracker.blocked = true;
      tracker.blockUntil = now + config.blockDurationMs;
      
      const retryAfter = Math.ceil(config.blockDurationMs / 1000);
      return NextResponse.json(
        { 
          error: 'Too many requests. Your IP has been temporarily blocked.',
          retryAfter 
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-Blocked-Until': new Date(tracker.blockUntil).toISOString(),
          },
        }
      );
    }

    // Add tracking headers
    const response = NextResponse.next();
    response.headers.set('X-Request-Count', tracker.count.toString());
    response.headers.set('X-RateLimit-Remaining', Math.max(0, config.maxRequests - tracker.count).toString());

    return null; // Continue with request
  };
}

// Predefined DDoS protection for different routes
export const standardDDoSProtection = createDDoSProtection({
  // Much more relaxed defaults for general traffic, especially useful in
  // local/dev environments and behind reverse proxies.
  maxRequests: 1000,
  windowMs: 60 * 1000, // 1 minute
  blockDurationMs: 5 * 60 * 1000, // 5 minutes
});

export const strictDDoSProtection = createDDoSProtection({
  maxRequests: 50,
  windowMs: 60 * 1000, // 1 minute
  blockDurationMs: 30 * 60 * 1000, // 30 minutes
});

export const apiDDoSProtection = createDDoSProtection({
  maxRequests: 200,
  windowMs: 60 * 1000, // 1 minute
  blockDurationMs: 10 * 60 * 1000, // 10 minutes
});


