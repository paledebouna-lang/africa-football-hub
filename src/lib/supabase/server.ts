import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readSupabaseConfig } from "./config";

/**
 * Supabase client bound to the request's cookies, so the signed-in user is
 * carried across server components and server actions.
 *
 * Returns null when the project is not configured, letting callers report a
 * useful message instead of failing deep inside the auth library.
 */
export async function createSupabaseServerClient() {
  const config = readSupabaseConfig();
  if (!config) return null;

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a server component, where cookies are read-only.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
