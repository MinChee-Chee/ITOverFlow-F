import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from 'next/server';
import { apiRateLimit, strictApiRateLimit, authRateLimit, chatRateLimit, sandboxRateLimit } from '@/lib/middleware/rate-limit';
import { apiDDoSProtection } from '@/lib/middleware/ddos-protection';

const isProtectedRoute = createRouteMatcher([
  "/ask-question(.*)",
  "/sandbox",
]);

const isAdminRoute = createRouteMatcher(['/admin(.*)']);
const isApiRoute = createRouteMatcher(['/api(.*)']);
const isAuthRoute = createRouteMatcher(['/api/auth(.*)', '/sign-in(.*)', '/sign-up(.*)']);
const isChatRoute = createRouteMatcher(['/api/chat(.*)']);
const isSandboxRoute = createRouteMatcher(['/api/sandbox(.*)']);

export default clerkMiddleware(async (auth, req: NextRequest) => {
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
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
