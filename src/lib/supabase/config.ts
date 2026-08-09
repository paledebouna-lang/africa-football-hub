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

export type ConfigDiagnosis = {
  urlPresent: boolean;
  urlLength: number;
  urlLooksValid: boolean;
  keyPresent: boolean;
  keyLength: number;
  keySegments: number;
};

/**
 * Metadata about the configuration, safe to display: lengths and shapes, never
 * the values themselves. This is what turns "it's still broken" into "the key
 * is present but only 40 characters — it was truncated on paste."
 */
export function diagnoseSupabaseConfig(): ConfigDiagnosis {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return {
    urlPresent: typeof url === "string" && url.length > 0,
    urlLength: url?.length ?? 0,
    urlLooksValid: typeof url === "string" && /^https:\/\/.+\.supabase\.co\/?$/.test(url.trim()),
    keyPresent: typeof anonKey === "string" && anonKey.length > 0,
    keyLength: anonKey?.length ?? 0,
    keySegments: typeof anonKey === "string" ? anonKey.trim().split(".").length : 0,
  };
}

export function readSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  // A real anon key is a JWT: three dot-separated parts. Catching a truncated
  // paste here is worth it — it is a common way to lose the last characters.
  const looksLikeJwt = typeof anonKey === "string" && anonKey.split(".").length === 3;

  if (!url || !anonKey || !looksLikeJwt) return null;
  return { url, anonKey };
}

export function missingConfigMessage(): string {
  const d = diagnoseSupabaseConfig();
  const details = [
    `URL : ${d.urlPresent ? `présente, ${d.urlLength} caractères${d.urlLooksValid ? "" : " (forme suspecte)"}` : "absente"}`,
    `Clé : ${d.keyPresent ? `présente, ${d.keyLength} caractères, ${d.keySegments} segment(s) séparé(s) par un point (il en faut 3)` : "absente"}`,
  ].join(" — ");

  return `La connexion aux comptes n'est pas disponible sur ce site. Diagnostic : ${details}.`;
}
