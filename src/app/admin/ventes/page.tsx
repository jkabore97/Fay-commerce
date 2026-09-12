import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { SalesList, type SaleRow } from "@/components/admin/sales/sales-list";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function VentesPage() {
  await requireStaff();
  const supabase = createClient();

  const { data } = await supabase
    .from("sales")
    .select(
      "id, kind, occurred_at, customer_name, total, method, note, reverses_id, quote_id",
    )
    .order("occurred_at", { ascending: false })
    .limit(100);

  const sales = (data as SaleRow[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventes"
        description="Consultez l'historique des ventes, ouvrez le détail d'un ticket et enregistrez les retours."
        actions={
          <LinkButton href="/admin/ventes/nouvelle">
            <Receipt className="h-4 w-4" /> Nouvelle vente
          </LinkButton>
        }
      />

      <SalesList sales={sales} />
    </div>
  );
}
