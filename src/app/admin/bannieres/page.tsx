import { PageHeader } from "@/components/ui/primitives";
import { BannersManager } from "@/components/admin/banners/banners-manager";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { Banner } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BannersPage() {
  await requireAdmin();
  const supabase = createClient();

  const { data } = await supabase
    .from("banners")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const banners = (data as Banner[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bannières & promotions"
        description="Les visuels promotionnels et les slides du carrousel d'accueil affichés sur la vitrine."
      />
      <BannersManager banners={banners} />
    </div>
  );
}
