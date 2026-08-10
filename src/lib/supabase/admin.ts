import { createClient } from "@supabase/supabase-js";
import { readSupabaseConfig } from "./config";

/**
 * Privileged Supabase client for server-only, admin-triggered operations —
 * currently just image uploads from the back office.
 *
 * The admin panel authenticates through its own ADMIN_PASSWORD cookie, not
 * Supabase Auth, so it never holds a member session and the storage bucket's
 * "authenticated" RLS policy would always reject it. This client uses the
 * service role key instead, which bypasses RLS entirely — safe here because
 * every caller is already gated by requireAdmin() before this is used.
 */
export function createSupabaseAdminClient() {
  const config = readSupabaseConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !serviceKey) return null;

  return createClient(config.url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
