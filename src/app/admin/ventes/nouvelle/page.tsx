import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import {
  SaleForm,
  type SaleProduct,
  type SaleLineDraft,
} from "@/components/admin/sales/sale-form";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NouvelleVentePage({
  searchParams,
}: {
  searchParams: { quote?: string };
}) {
  await requireStaff();
  const supabase = createClient();

  const quoteId =
    typeof searchParams.quote === "string" && searchParams.quote
      ? searchParams.quote
      : undefined;

  const { data: productsData } = await supabase
    .from("products")
    .select("id, name, sale_price, unit, quantity, sku")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const products = (productsData as SaleProduct[] | null) ?? [];

  let initialCustomer: string | undefined;
  let initialLines: SaleLineDraft[] | undefined;
  let effectiveQuoteId: string | undefined;

  if (quoteId) {
    const [quoteRes, itemsRes] = await Promise.all([
      supabase
        .from("quote_requests")
        .select("customer_name, company")
        .eq("id", quoteId)
        .maybeSingle(),
      supabase
        .from("quote_items")
        .select("product_id, name, quantity, unit")
        .eq("quote_id", quoteId),
    ]);

    if (quoteRes.data) {
      effectiveQuoteId = quoteId;
      const q = quoteRes.data as { customer_name: string; company: string | null };
      initialCustomer = q.company
        ? `${q.customer_name} · ${q.company}`
        : q.customer_name;

      const priceById = new Map(products.map((p) => [p.id, p.sale_price]));
      const unitById = new Map(products.map((p) => [p.id, p.unit]));
      const items =
        (itemsRes.data as
          | {
              product_id: string | null;
              name: string;
              quantity: number;
              unit: string | null;
            }[]
          | null) ?? [];
      initialLines = items.map((it) => ({
        product_id: it.product_id,
        name: it.name,
        quantity: it.quantity,
        unit_price: it.product_id ? priceById.get(it.product_id) ?? 0 : 0,
        unit: it.product_id ? unitById.get(it.product_id) ?? it.unit : it.unit,
      }));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouvelle vente"
        description={
          effectiveQuoteId
            ? "Vente pré-remplie à partir d'un devis. Vérifiez les quantités et les prix avant d'enregistrer."
            : "Composez le ticket, choisissez la méthode de paiement et enregistrez la vente."
        }
        actions={
          <LinkButton href="/admin/ventes" variant="outline">
            <ArrowLeft className="h-4 w-4" /> Retour aux ventes
          </LinkButton>
        }
      />

      <SaleForm
        products={products}
        initialCustomer={initialCustomer}
        initialLines={initialLines}
        quoteId={effectiveQuoteId}
      />
    </div>
  );
}
