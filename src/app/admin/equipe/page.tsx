import { PageHeader } from "@/components/ui/primitives";
import { TeamManager } from "@/components/admin/team/team-manager";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { Staff } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EquipePage() {
  const staff = await requireAdmin();
  const supabase = createClient();

  const { data } = await supabase
    .from("staff")
    .select("*")
    .order("created_at", { ascending: true });

  const team = (data as Staff[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Équipe"
        description="Gérez les comptes du personnel, leurs rôles et leur accès au back-office."
      />
      <TeamManager staff={team} currentId={staff.id} />
    </div>
  );
}
