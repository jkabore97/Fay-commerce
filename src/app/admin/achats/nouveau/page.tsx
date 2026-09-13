import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import {
  PurchaseForm,
  type PurchaseProduct,
} from "@/components/admin/purchases/purchase-form";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { Supplier } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NouvelAchatPage() {
  await requireAdmin();
  const supabase = createClient();

  const [productsRes, suppliersRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, cost_price, unit, sku")
      .order("name"),
    supabase.from("suppliers").select("*").order("name"),
  ]);

  const products = (productsRes.data as PurchaseProduct[] | null) ?? [];
  const suppliers = (suppliersRes.data as Supplier[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/achats"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brass-600 hover:text-brass-700"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux achats
        </Link>
        <PageHeader
          title="Réception / nouvel achat"
          description="Enregistrez la marchandise reçue d'un fournisseur : le stock est augmenté et l'achat est inscrit dans la comptabilité."
        />
      </div>

      <PurchaseForm products={products} suppliers={suppliers} />
    </div>
  );
}
