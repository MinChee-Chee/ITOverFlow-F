import { NextRequest, NextResponse } from 'next/server';

// In-memory store for rate limiting (use Redis in production)
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
}

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
  } = options;

  return async (req: NextRequest): Promise<NextResponse | null> => {
    // Get client identifier (IP address or user ID)
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
    const userId = req.headers.get('x-user-id') || '';
    
    // Use user ID if available, otherwise use IP
    const identifier = userId || ip;
    const key = `${identifier}:${Math.floor(Date.now() / windowMs)}`;

    // Get or create rate limit entry
    if (!store[key]) {
      store[key] = {
        count: 0,
        resetTime: Date.now() + windowMs,
      };
    }

    const entry = store[key];

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { error: message, retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
          },
        }
      );
    }

    // Increment counter
    entry.count++;

    // Add rate limit headers to response
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count).toString());
    response.headers.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    return null; // Continue with request
  };
}

// Predefined rate limiters for different use cases
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 300, // 300 requests per 15 minutes
  message: 'API rate limit exceeded. Please try again later.',
});

// Less strict limiter for high-frequency chat traffic
export const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 120, // 120 requests per minute per user/IP
  message: 'Too many chat requests. Please slow down.',
});

// Dedicated limiter for sandbox API routes (still guarded, but less strict)
export const sandboxRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 40, // 40 requests per minute per user/IP
  message: 'Too many sandbox requests. Please slow down.',
});

export const strictApiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 40, // 40 requests per minute
  message: 'Too many requests. Please slow down.',
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 login attempts per 15 minutes
  message: 'Too many authentication attempts. Please try again later.',
});


