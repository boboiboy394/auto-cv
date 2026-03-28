import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

/**
 * Factory: creates a fresh Supabase admin client.
 * Call this inside route handlers — never at module scope.
 * Bypasses RLS via SERVICE ROLE key.
 */
export function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing Supabase env var: NEXT_PUBLIC_SUPABASE_URL");
  }

  // In development, allow anon key fallback if service role key is not set.
  // This works only when RLS is disabled (or permissive policies exist).
  const key = supabaseServiceKey || supabaseAnonKey;
  if (!key) {
    throw new Error(
      "Missing Supabase env vars: set SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient<Database>(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
