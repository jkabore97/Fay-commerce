import { Truck, Warehouse } from "lucide-react";
import { PageHeader, Stat } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import {
  PurchasesList,
  type PurchaseRow,
} from "@/components/admin/purchases/purchases-list";
import { SuppliersManager } from "@/components/admin/purchases/suppliers-manager";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { Supplier } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AchatsPage() {
  await requireAdmin();
  const supabase = createClient();

  const [purchasesRes, suppliersRes] = await Promise.all([
    supabase
      .from("purchases")
      .select("*, suppliers(name)")
      .order("occurred_at", { ascending: false })
      .limit(100),
    supabase.from("suppliers").select("*").order("name"),
  ]);

  const purchases = (purchasesRes.data as PurchaseRow[] | null) ?? [];
  const suppliers = (suppliersRes.data as Supplier[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Achats"
        description="Réceptionnez la marchandise, suivez l'historique des achats et gérez vos fournisseurs."
        actions={
          <LinkButton href="/admin/achats/nouveau">
            <Warehouse className="h-4 w-4" /> Réception / nouvel achat
          </LinkButton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Achats enregistrés"
          value={purchases.length}
          sub="100 derniers"
          icon={<Truck className="h-5 w-5" />}
          tone="brass"
        />
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-steel-900">
          Historique des achats
        </h2>
        <PurchasesList purchases={purchases} />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-steel-900">
          Fournisseurs
        </h2>
        <SuppliersManager suppliers={suppliers} />
      </section>
    </div>
  );
}
