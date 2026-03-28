import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

async function getUserId(req: Request): Promise<string | null> {
  const isDev = process.env.NODE_ENV !== "production";
  const devUserId = req.headers.get("x-test-user-id");
  if (isDev) return devUserId;
  const authResult = await auth();
  return authResult?.userId ?? null;
}

/** GET /api/jobs/:id */
export async function GET(req: Request, ctx: RouteContext) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const supabase = createSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("job_applications") as any)
    .select("*").eq("id", id).eq("user_id", userId).single();

  if (error || !data) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json(data, { status: 200 });
}

/** PATCH /api/jobs/:id */
export async function PATCH(req: Request, ctx: RouteContext) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const { status, jdText, jdUrl } = body as {
    status?: string;
    jdText?: string;
    jdUrl?: string;
  };

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (jdText !== undefined) updates.jd_text = jdText;
  if (jdUrl !== undefined) updates.jd_url = jdUrl;

  const supabase = createSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("job_applications") as any)
    .update(updates).eq("id", id).eq("user_id", userId).select().single();

  if (error || !data) {
    console.error("PATCH /api/jobs/:id error:", error);
    return NextResponse.json({ error: "Job not found or not owned" }, { status: 404 });
  }
  return NextResponse.json(data, { status: 200 });
}

/** DELETE /api/jobs/:id */
export async function DELETE(req: Request, ctx: RouteContext) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const supabase = createSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("job_applications") as any)
    .delete().eq("id", id).eq("user_id", userId);

  if (error) {
    console.error("DELETE /api/jobs/:id error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  return NextResponse.json({ success: true }, { status: 200 });
}
