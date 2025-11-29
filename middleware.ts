import { authMiddleware } from "@clerk/nextjs/server";

export default authMiddleware({
  // Routes that don't require authentication
  publicRoutes: [
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/question(.*)",
    "/tags(.*)",
    "/profile(.*)",
    "/community(.*)",
    "/collection(.*)",
  ],
  // Routes that require authentication (ask-question and sandbox are protected by default)
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
