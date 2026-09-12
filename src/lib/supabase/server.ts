import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Server Supabase client bound to the request cookies. Safe to call from
 * Server Components, Route Handlers, and Server Actions.
 *
 * Writing cookies from a Server Component throws in Next.js; the setAll adapter
 * swallows that case because the middleware is responsible for refreshing the
 * session cookie on every request.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    SUPABASE_URL || "https://placeholder.supabase.co",
    SUPABASE_ANON_KEY || "placeholder-anon-key",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: CookieOptions;
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — ignore; middleware refreshes it.
          }
        },
      },
    },
  );
}
