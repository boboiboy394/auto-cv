import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { WebhookEvent } from "@clerk/nextjs/server";

// Disable static optimization — we need runtime env vars at request time
export const dynamic = "force-dynamic";
// Disable Next.js body parsing — raw body needed for webhook signature verification
export const runtime = "nodejs";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // Get raw body and headers
  const body = await req.text();
  const headersList = await headers();
  const svix_id = headersList.get("svix-id");
  const svix_timestamp = headersList.get("svix-timestamp");
  const svix_signature = headersList.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  // Verify webhook signature
  const svix = new Webhook(WEBHOOK_SECRET);
  let event: WebhookEvent;
  try {
    event = svix.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = event;

  const supabaseAdmin = createSupabaseAdmin();

  // Handle user.created → auto-create profile in Supabase
  if (type === "user.created") {
    const { id: clerk_user_id, email_addresses, username, first_name, last_name } = data;
    const primaryEmail = email_addresses?.[0]?.email_address ?? "";
    const fullName = [first_name, last_name].filter(Boolean).join(" ") || username || "User";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin.from("profiles") as any).upsert(
      {
        id: clerk_user_id as string,
        email: primaryEmail,
        full_name: fullName,
        credits: 3,
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("Failed to create profile for user:", clerk_user_id, error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    console.log("Profile created for user:", clerk_user_id);
  }

  // Handle user.deleted → cleanup
  if (type === "user.deleted") {
    const { id: clerk_user_id } = data;
    await supabaseAdmin.from("profiles").delete().eq("id", clerk_user_id as string);
    console.log("Profile deleted for user:", clerk_user_id);
  }

  return NextResponse.json({ received: true });
}
