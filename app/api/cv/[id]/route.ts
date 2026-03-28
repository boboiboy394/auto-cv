import { NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { deleteCVFile } from "@/lib/supabase/storage";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/cv/:id */
export async function GET(req: Request, ctx: RouteContext) {
  const userId = await getServerUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const supabase = createSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("cvs") as any)
    .select("*").eq("id", id).eq("user_id", userId).single();

  if (error || !data) return NextResponse.json({ error: "CV_NOT_FOUND" }, { status: 404 });
  return NextResponse.json(data, { status: 200 });
}

/** DELETE /api/cv/:id — removes DB record + storage file */
export async function DELETE(req: Request, ctx: RouteContext) {
  const userId = await getServerUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const supabase = createSupabaseAdmin();

  // Fetch storage path first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cv, error: fetchError } = await (supabase.from("cvs") as any)
    .select("storage_path").eq("id", id).eq("user_id", userId).single();

  if (fetchError || !cv) {
    return NextResponse.json({ error: "CV_NOT_FOUND" }, { status: 404 });
  }

  // Delete storage file (best-effort)
  if (cv.storage_path) {
    await deleteCVFile(cv.storage_path);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("cvs") as any)
    .delete().eq("id", id).eq("user_id", userId);

  if (error) {
    console.error("DELETE /api/cv/:id error:", error);
    return NextResponse.json({ error: "DELETE_FAILED" }, { status: 500 });
  }
  return NextResponse.json({ success: true }, { status: 200 });
}
