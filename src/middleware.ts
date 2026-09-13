import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/env";

/**
 * Runs on every request: refreshes the Supabase auth cookie so Server
 * Components always see a valid session, and bounces signed-out visitors away
 * from the /admin area before a page even renders. Fine-grained role checks
 * (admin vs employee) happen in the server components via requireAdmin().
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  // No Supabase configured → the admin can't be used anyway; let pages render.
  if (!isSupabaseConfigured()) {
    if (request.nextUrl.pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: CookieOptions;
        }[],
      ) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (path.startsWith("/admin") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // Note: we deliberately do NOT auto-redirect /login → /admin for a signed-in
  // user. A user who is authenticated but has no active `staff` row is bounced
  // to /login?denied=1 by requireStaff(); auto-redirecting here would ping-pong
  // between /login and /admin forever.

  return response;
}

export const config = {
  // Everything except Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
