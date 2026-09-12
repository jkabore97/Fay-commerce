import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Role, Staff } from "@/lib/types";

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

/** Redirect to the login page unless a valid staff member is signed in. */
export async function requireStaff(): Promise<Staff> {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");
  return staff;
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

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrateur",
  employee: "Employé",
};
