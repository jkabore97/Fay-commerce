import { AlertTriangle, Boxes, Warehouse } from "lucide-react";
import { PageHeader, Stat } from "@/components/ui/primitives";
import {
  StockManager,
  type StockProduct,
  type StockMovementRow,
} from "@/components/admin/stock/stock-manager";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const staff = await requireStaff();
  const isAdmin = staff.role === "admin";
  const supabase = createClient();

  const [productsRes, movementsRes, invValue] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, sku, unit, quantity, low_stock_at, cost_price, is_active")
      .order("name", { ascending: true }),
    supabase
      .from("stock_movements")
      .select("*, products(name, sku, unit)")
      .order("created_at", { ascending: false })
      .limit(50),
    isAdmin ? supabase.rpc("inventory_value") : Promise.resolve({ data: 0 }),
  ]);

  const products = (productsRes.data as StockProduct[] | null) ?? [];
  const movements = (movementsRes.data as StockMovementRow[] | null) ?? [];

  const activeCount = products.filter((p) => p.is_active).length;
  const lowCount = products.filter(
    (p) => p.low_stock_at != null && p.quantity <= p.low_stock_at,
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock & mouvements"
        description="Suivez les quantités en stock, corrigez l'inventaire et consultez l'historique des mouvements."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat
          label="Produits actifs"
          value={activeCount}
          icon={<Boxes className="h-5 w-5" />}
          tone="steel"
        />
        <Stat
          label="Produits en stock bas"
          value={lowCount}
          sub="au niveau ou sous le seuil"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={lowCount > 0 ? "red" : "green"}
        />
        {isAdmin && (
          <Stat
            label="Valeur du stock"
            value={formatMoney((invValue?.data as number) ?? 0)}
            sub="au prix d'achat"
            icon={<Warehouse className="h-5 w-5" />}
            tone="cobalt"
          />
        )}
      </div>

      <StockManager products={products} movements={movements} isAdmin={isAdmin} />
    </div>
  );
}
