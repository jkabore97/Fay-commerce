import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Staff } from "@/lib/types";

/**
 * The signed-in staff member for the current request, or null.
 *
 * Identity comes from Supabase Auth (getUser validates the JWT with the auth
 * server); the role comes from the `staff` table, which RLS lets a user read
 * only for their own row. A user with an auth account but no active staff row
 * is treated as not-staff.
 */
export async function getCurrentStaff(): Promise<Staff | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("staff")
    .select("*")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return (data as Staff | null) ?? null;
}

/**
 * Guard for the back-office. Redirects:
 *  - to /login              when nobody is signed in
 *  - to /login?denied=1     when signed in but with no active staff row
 *    (so the login page can explain the account isn't linked to staff access —
 *     the common "I created an admin but it doesn't work" case)
 */
export async function requireStaff(): Promise<Staff> {
  if (!isSupabaseConfigured()) redirect("/login");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("staff")
    .select("*")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) redirect("/login?denied=1");
  return data as Staff;
}

/** Redirect employees away from admin-only areas. */
export async function requireAdmin(): Promise<Staff> {
  const staff = await requireStaff();
  if (staff.role !== "admin") redirect("/admin?denied=admin");
  return staff;
}

export function isAdmin(staff: Staff | null): staff is Staff & { role: "admin" } {
  return staff?.role === "admin";
}

// Re-exported for server-side convenience. Client components must import
// ROLE_LABELS from "@/lib/constants" directly (this module pulls in the
// server-only Supabase client and cannot be bundled for the browser).
export { ROLE_LABELS } from "@/lib/constants";
