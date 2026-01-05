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
  '/api/auth/check-role', // Check role endpoint should be accessible to check auth status
  '/api/huggingface/tag-info', // Tag info endpoint should be public (no auth required)
  '/api/google-gemini/tag-info', // Tag info endpoint should be public (no auth required)
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

  const pathname = req.nextUrl.pathname;
  if (isPublicRoute(req) || pathname.startsWith('/api/webhooks') || pathname === '/api/auth/check-role' || pathname.startsWith('/api/huggingface/tag-info') || pathname.startsWith('/api/google-gemini/tag-info')) {
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

  // Get auth data early to check locked/banned status before requiring auth
  const authData = await auth();
  
  // Check if user is locked or banned (before requiring authentication)
  // This allows us to return proper JSON errors for API routes
  if (authData.userId) {
    const sessionClaims = authData.sessionClaims as any;
    const isLocked = sessionClaims?.metadata?.locked === true || 
                     sessionClaims?.publicMetadata?.locked === true;
    const isBanned = sessionClaims?.metadata?.banned === true || 
                     sessionClaims?.publicMetadata?.banned === true;

    // Allow access to sign-out and public routes even if locked/banned
    // But block access to all other routes
    if ((isLocked || isBanned) && !isPublicRoute(req) && !pathname.startsWith('/sign-out')) {
      // For API routes, return JSON error instead of redirect
      if (isApiRoute(req)) {
        return NextResponse.json(
          { 
            error: isBanned ? 'Your account has been banned' : 'Your account has been locked',
            code: isBanned ? 'BANNED' : 'LOCKED'
          },
          { status: 403 }
        );
      }
      // For page routes, redirect to sign-in
      const url = new URL('/sign-in', req.url);
      url.searchParams.set('error', isBanned ? 'banned' : 'locked');
      return NextResponse.redirect(url);
    }
  }

  // Require authentication for all API routes
  if (isApiRoute(req)) {
    try {
      await auth.protect();
    } catch (error) {
      // If protect() throws (user not authenticated), return JSON error instead of redirect
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }
  }

  // Clerk authentication checks
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Protect all routes starting with `/admin`
  // For API routes, return JSON error instead of redirect
  if (isAdminRoute(req)) {
    const adminAuthData = await auth();
    if (adminAuthData.sessionClaims?.metadata?.role !== 'admin') {
      if (isApiRoute(req)) {
        return NextResponse.json(
          { error: 'Unauthorized: Admin access required' },
          { status: 403 }
        );
      }
      const url = new URL('/', req.url);
      return NextResponse.redirect(url);
    }
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
