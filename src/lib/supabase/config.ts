/**
 * Supabase connection settings, checked before use.
 *
 * When these are missing the failures are baffling rather than informative:
 * the browser client reports "Invalid Compact JWS" because it signs with an
 * undefined key, and the server client reports "Unexpected token '<'" because
 * it posts to an invalid URL and gets an HTML error page back. Neither message
 * hints at the actual cause, so the check happens here instead.
 */
export type SupabaseConfig = { url: string; anonKey: string };

export function readSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // A real anon key is a JWT: three dot-separated parts. Catching a truncated
  // paste here is worth it — it is a common way to lose the last characters.
  const looksLikeJwt = typeof anonKey === "string" && anonKey.split(".").length === 3;

  if (!url || !anonKey || !looksLikeJwt) return null;
  return { url, anonKey };
}

export const MISSING_CONFIG_MESSAGE =
  "La connexion aux comptes n'est pas configurée sur ce site : les variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY manquent dans les réglages Vercel. Ajoute-les, puis relance le déploiement.";
