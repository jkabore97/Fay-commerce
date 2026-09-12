import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/env";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

const ROLES: Role[] = ["admin", "employee"];

/**
 * POST /api/admin/staff — provisions an employee account.
 *
 * Creating a Supabase Auth user requires the service-role key, which never
 * reaches the browser, so this work lives on the server. The caller is
 * re-verified as an active admin here (RLS lets a user read only their own
 * staff row) before the service-role client is ever touched.
 */
export async function POST(request: Request) {
  try {
    // 1. Verify the caller is an active administrator.
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const { data: me } = await supabase
      .from("staff")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (!me || !me.is_active || me.role !== "admin") {
      return NextResponse.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 },
      );
    }

    // 2. The service-role key is required to create an auth account.
    if (!hasServiceRole()) {
      return NextResponse.json(
        {
          error:
            "La clé de service Supabase n'est pas configurée : impossible de créer un compte employé.",
        },
        { status: 400 },
      );
    }

    // 3. Read and validate the payload.
    const body = (await request.json().catch(() => null)) as {
      email?: string;
      password?: string;
      full_name?: string;
      role?: string;
      phone?: string;
    } | null;

    const email = body?.email?.trim().toLowerCase() ?? "";
    const password = body?.password ?? "";
    const full_name = body?.full_name?.trim() ?? "";
    const phone = body?.phone?.trim() || null;
    const role = (body?.role ?? "employee") as Role;

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: "Champs obligatoires manquants (nom, email, mot de passe)." },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 6 caractères." },
        { status: 400 },
      );
    }
    if (!ROLES.includes(role)) {
      return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
    }

    // 4. Create the auth account, then promote it with a staff row.
    const admin = createAdminClient();
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError || !created?.user) {
      return NextResponse.json(
        { error: createError?.message ?? "Échec de la création du compte." },
        { status: 400 },
      );
    }

    const { error: staffError } = await admin
      .from("staff")
      .insert({ id: created.user.id, full_name, role, phone });

    if (staffError) {
      // Roll back the orphaned auth account so the email can be reused.
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
      return NextResponse.json({ error: staffError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Erreur serveur inattendue.",
      },
      { status: 500 },
    );
  }
}
