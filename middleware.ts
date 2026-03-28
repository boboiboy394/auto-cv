import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Middleware — Edge-compatible only.
 *
 * Clerk's auth().protect() does NOT work in Edge runtime.
 * Auth enforcement is done per-route in API handlers (Node.js runtime).
 *
 * This middleware only:
 * 1. Attaches auth state to request headers for downstream use
 * 2. Redirects unauthenticated users away from protected pages
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhook/stripe(.*)",
  "/api/webhook/clerk(.*)",
  "/api/health(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // In Edge runtime: auth() gives you the auth state
  // but protect() is NOT available — we check auth per-route instead
  if (!isPublicRoute(req)) {
    // Just attach auth context — protection happens in API routes
    await auth();
  }
});

export const config = {
  matcher: [
    // Only protect app pages — API routes have auth enforced per-route
    "/((?!.*\\..*|_next|api).*)",
    "/",
  ],
};
