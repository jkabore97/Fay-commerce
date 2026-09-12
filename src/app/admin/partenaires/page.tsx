import { PageHeader } from "@/components/ui/primitives";
import { PartnersManager } from "@/components/admin/partners/partners-manager";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { Partner } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  await requireAdmin();
  const supabase = createClient();

  const { data } = await supabase
    .from("partners")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const partners = (data as Partner[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partenaires"
        description="Les logos et enseignes partenaires affichés sur la vitrine."
      />
      <PartnersManager partners={partners} />
    </div>
  );
}
