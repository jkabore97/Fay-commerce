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

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
