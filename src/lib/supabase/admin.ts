import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  hasServiceRole,
} from "@/lib/env";

/**
 * Service-role client — bypasses RLS. Server-only, never sent to the browser.
 * Used exclusively for admin-gated user provisioning (creating an employee's
 * auth account). Every route that uses it must first verify the caller is an
 * admin via requireAdmin().
 */
export function createAdminClient() {
  if (!hasServiceRole()) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquant : impossible de créer un compte employé.",
    );
  }
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
