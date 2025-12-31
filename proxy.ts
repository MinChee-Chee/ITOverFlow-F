import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from 'next/server';
import { apiRateLimit, authRateLimit, chatRateLimit, sandboxRateLimit } from '@/lib/middleware/rate-limit';
import { apiDDoSProtection } from '@/lib/middleware/ddos-protection';

const isProtectedRoute = createRouteMatcher([
  "/ask-question(.*)",
  "/sandbox",
]);

const isPublicRoute = createRouteMatcher([
  '/api/webhooks(.*)', // Webhooks use signature verification, not user auth
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

const isAdminRoute = createRouteMatcher(['/admin(.*)']);
const isApiRoute = createRouteMatcher(['/api(.*)']);
const isAuthRoute = createRouteMatcher(['/api/auth(.*)', '/sign-in(.*)', '/sign-up(.*)']);
const isChatRoute = createRouteMatcher(['/api/chat(.*)']);
const isSandboxRoute = createRouteMatcher(['/api/sandbox(.*)']);
const isWebhookRoute = createRouteMatcher(['/api/webhooks(.*)']);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Early return for public routes (webhooks, sign-in, sign-up)
  // Check both the route matcher and the path directly to ensure webhooks are excluded
  const pathname = req.nextUrl.pathname;
  if (isPublicRoute(req) || pathname.startsWith('/api/webhooks')) {
    return NextResponse.next();
  }

  // Apply DDoS protection only to API routes (not to every page view),
  // to avoid overly aggressive blocking on normal navigation.
  if (isApiRoute(req)) {
    const apiDDoS = await apiDDoSProtection(req);
    if (apiDDoS) {
      return apiDDoS;
    }
  }

  // Apply rate limiting to API routes
  if (isApiRoute(req)) {
    // Stricter rate limiting for auth routes
    if (isAuthRoute(req)) {
      const authLimit = await authRateLimit(req);
      if (authLimit) {
        return authLimit;
      }
    }
    // Dedicated rate limiting for sandbox routes
    else if (isSandboxRoute(req)) {
      const sandboxLimit = await sandboxRateLimit(req);
      if (sandboxLimit) {
        return sandboxLimit;
      }
    }
    // Dedicated rate limiting for chat routes (higher throughput)
    else if (isChatRoute(req)) {
      const chatLimit = await chatRateLimit(req);
      if (chatLimit) {
        return chatLimit;
      }
    }
    // Standard rate limiting for other API routes
    else {
      const apiLimit = await apiRateLimit(req);
      if (apiLimit) {
        return apiLimit;
      }
    }
  }

  // Require authentication for all API routes
  if (isApiRoute(req)) {
    await auth.protect();
  }

  // Clerk authentication checks
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Protect all routes starting with `/admin`
  if (isAdminRoute(req) && (await auth()).sessionClaims?.metadata?.role !== 'admin') {
    const url = new URL('/', req.url);
    return NextResponse.redirect(url);
  }
});

export const config = {
  // Apply middleware to all routes except static files, Next.js internals, and webhooks
  // Webhooks are excluded from the matcher so middleware never runs for them
  matcher: [
    // Standard Next.js pattern excluding static files, Next.js internals, and webhooks
    '/((?!_next|api/webhooks|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
