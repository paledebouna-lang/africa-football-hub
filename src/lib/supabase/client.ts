import { createBrowserClient } from "@supabase/ssr";
import { readSupabaseConfig } from "./config";

/** Returns null when the project is not configured, so callers can say so. */
export function createSupabaseBrowserClient() {
  const config = readSupabaseConfig();
  if (!config) return null;

  return createBrowserClient(config.url, config.anonKey);
}
