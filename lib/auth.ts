/**
 * Server-side auth helper.
 * Extracts userId from Clerk session (dev/test) or request header.
 */
export async function getServerUserId(req: Request): Promise<string | null> {
  const devUserId = req.headers.get("x-test-user-id");
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev && devUserId) {
    return devUserId;
  }

  // Dynamic import to avoid server-only errors in test environments
  const { auth } = await import("@clerk/nextjs/server");
  const authResult = await auth();
  return authResult?.userId ?? null;
}
