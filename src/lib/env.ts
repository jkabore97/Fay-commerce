// Centralised, defensive access to environment configuration.
//
// The whole app is written so that a missing Supabase config is a valid state:
// the vitrine renders with built-in defaults and data-driven areas degrade to
// friendly empty states instead of crashing the build or a page render.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const MEDIA_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET ?? "media";

/**
 * Normalise NEXT_PUBLIC_SITE_URL into a valid absolute URL string.
 *
 * A value like `fay-commerce.vercel.app` (no scheme) is a common mistake, and
 * `new URL()` throws on it — which would crash prerendering of every page at
 * build time (metadataBase). So we prepend https:// when the scheme is missing
 * and fall back to localhost if the value is unusable. The build must never
 * fail because of a mistyped env var.
 */
function normalizeSiteUrl(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "http://localhost:3000";
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return "http://localhost:3000";
  }
}

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export const SITE_NAME = "Fay & Partenaires";

/** True only when both the URL and the anon key are present and look valid. */
export function isSupabaseConfigured(): boolean {
  return (
    SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 20
  );
}

/** True when the server holds a service-role key (admin user provisioning). */
export function hasServiceRole(): boolean {
  return SUPABASE_SERVICE_ROLE_KEY.length > 20;
}
