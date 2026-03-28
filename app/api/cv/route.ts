import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/cv — List all CVs for the authenticated user.
 */
export async function GET(req: Request) {
  // Dev/test bypass: pass x-test-user-id header to skip Clerk auth
  const devUserId = req.headers.get("x-test-user-id");
  const isDev = process.env.NODE_ENV !== "production";

  let userId: string | null = null;
  if (isDev) {
    // In dev/test we only use x-test-user-id; no Clerk call
    userId = devUserId;
  } else {
    const authResult = await auth();
    userId = authResult?.userId ?? null;
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("cvs") as any)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET /api/cv error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/**
 * POST /api/cv — Create a new CV record.
 */
export async function POST(req: Request) {
  const devUserId = req.headers.get("x-test-user-id");
  const isDev = process.env.NODE_ENV !== "production";

  let userId: string | null = null;
  if (isDev) {
    // In dev/test we only use x-test-user-id; no Clerk call
    userId = devUserId;
  } else {
    const authResult = await auth();
    userId = authResult?.userId ?? null;
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { originalName, storagePath } = body as {
    originalName?: string;
    storagePath?: string;
    mimeType?: string;
  };

  if (!originalName || typeof originalName !== "string") {
    return NextResponse.json(
      { error: "Missing required field: originalName" },
      { status: 400 }
    );
  }

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (body.mimeType && !allowedTypes.includes(body.mimeType)) {
    return NextResponse.json(
      { error: "INVALID_FILE_TYPE: Only PDF and DOCX allowed" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("cvs") as any)
    .insert({
      user_id: userId,
      original_name: originalName,
      storage_path: storagePath ?? "",
    })
    .select()
    .single();

  if (error) {
    console.error("POST /api/cv error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
