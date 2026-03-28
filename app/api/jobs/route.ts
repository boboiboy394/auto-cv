import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

async function getUserId(req: Request): Promise<string | null> {
  const isDev = process.env.NODE_ENV !== "production";
  const devUserId = req.headers.get("x-test-user-id");
  if (isDev) return devUserId;
  const authResult = await auth();
  return authResult?.userId ?? null;
}

/** GET /api/jobs */
export async function GET(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("job_applications") as any)
    .select("*").eq("user_id", userId).order("created_at", { ascending: false });

  if (error) {
    console.error("GET /api/jobs error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  return NextResponse.json(data, { status: 200 });
}

/** POST /api/jobs */
export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { cvId, jdText, jdUrl } = body as {
    cvId?: string;
    jdText?: string;
    jdUrl?: string;
  };

  if (!jdText && !jdUrl) {
    return NextResponse.json(
      { error: "At least one of jdText or jdUrl is required" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdmin();

  if (cvId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cv } = await (supabase.from("cvs") as any)
      .select("id").eq("id", cvId).eq("user_id", userId).single();
    if (!cv) return NextResponse.json({ error: "CV not found or not owned" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("credits").eq("id", userId).single();
  if (!profile || profile.credits <= 0) {
    return NextResponse.json({ error: "NO_CREDITS" }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("job_applications") as any)
    .insert({
      user_id: userId,
      cv_id: cvId ?? null,
      jd_text: jdText ?? null,
      jd_url: jdUrl ?? null,
      status: jdText ? "jd_analyzed" : "cv_uploaded",
    })
    .select()
    .single();

  if (error) {
    console.error("POST /api/jobs error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
