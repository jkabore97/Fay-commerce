import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  ClipboardList,
  Coins,
  Receipt,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import { Card, EmptyState, PageHeader, Stat } from "@/components/ui/primitives";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { SalesChart } from "@/components/admin/sales-chart";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { formatMoney, formatDate } from "@/lib/format";
import { QUOTE_STATUS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const staff = await requireStaff();
  const isAdmin = staff.role === "admin";
  const supabase = createClient();

  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000)
    .toISOString()
    .slice(0, 10);

  const [
    dayRes,
    seriesRes,
    lowRes,
    quotesRes,
    salesRes,
    productsCount,
    newQuotesCount,
    invValue,
    report,
  ] = await Promise.all([
    supabase.rpc("store_day", { p_on: today }),
    supabase.rpc("sales_by_day", { p_days: 14 }),
    supabase.rpc("low_stock"),
    supabase
      .from("quote_requests")
      .select("id, ref, customer_name, company, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("sales")
      .select("id, customer_name, total, kind, occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(6),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("quote_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    isAdmin ? supabase.rpc("inventory_value") : Promise.resolve({ data: 0 }),
    isAdmin
      ? supabase.rpc("sales_report", { p_from: monthAgo, p_to: today })
      : Promise.resolve({ data: null }),
  ]);

  const day = dayRes.data?.[0] ?? { net_sales: 0, sale_count: 0 };
  const series = seriesRes.data ?? [];
  const low = lowRes.data ?? [];
  const quotes = quotesRes.data ?? [];
  const sales = salesRes.data ?? [];
  // sales_report() is a set-returning function → data is a one-row array.
  const rep =
    ((report?.data as { revenue: number; margin: number }[] | null) ?? [])[0] ??
    null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bonjour, ${staff.full_name.split(" ")[0]}`}
        description="Voici l'activité de Fay & Partenaires aujourd'hui."
        actions={
          <>
            <LinkButton href="/admin/ventes/nouvelle" variant="outline">
              <Receipt className="h-4 w-4" /> Nouvelle vente
            </LinkButton>
            {isAdmin && (
              <LinkButton href="/admin/achats/nouveau">
                <Warehouse className="h-4 w-4" /> Réception stock
              </LinkButton>
            )}
          </>
        }
      />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Ventes du jour"
          value={formatMoney(day.net_sales)}
          sub={`${day.sale_count} vente${day.sale_count > 1 ? "s" : ""}`}
          icon={<Receipt className="h-5 w-5" />}
          tone="cobalt"
        />
        {isAdmin ? (
          <>
            <Stat
              label="Chiffre d'affaires (30j)"
              value={formatMoney(rep?.revenue ?? 0)}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="green"
            />
            <Stat
              label="Marge (30j)"
              value={formatMoney(rep?.margin ?? 0)}
              icon={<Coins className="h-5 w-5" />}
              tone="steel"
            />
            <Stat
              label="Valeur du stock"
              value={formatMoney((invValue?.data as number) ?? 0)}
              sub="au prix d'achat"
              icon={<Boxes className="h-5 w-5" />}
              tone="steel"
            />
          </>
        ) : (
          <>
            <Stat
              label="Produits actifs"
              value={productsCount.count ?? 0}
              icon={<Boxes className="h-5 w-5" />}
              tone="steel"
            />
            <Stat
              label="Stock bas"
              value={low.length}
              sub="à réapprovisionner"
              icon={<AlertTriangle className="h-5 w-5" />}
              tone={low.length > 0 ? "red" : "green"}
            />
            <Stat
              label="Nouveaux devis"
              value={newQuotesCount.count ?? 0}
              icon={<ClipboardList className="h-5 w-5" />}
              tone="cobalt"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-steel-900">
              Ventes nettes — 14 derniers jours
            </h2>
          </div>
          {series.length > 0 ? (
            <SalesChart data={series} />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-steel-400">
              Aucune donnée de vente pour l'instant.
            </div>
          )}
        </Card>

        {/* Low stock */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-steel-900">
              Stock bas
            </h2>
            <Link href="/admin/stock" className="text-xs font-semibold text-cobalt-600 hover:text-cobalt-700">
              Tout voir
            </Link>
          </div>
          {low.length > 0 ? (
            <ul className="space-y-3">
              {low.slice(0, 6).map((p: any) => (
                <li key={p.product_id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-steel-900">{p.name}</p>
                    {p.sku && <p className="text-xs text-steel-400">{p.sku}</p>}
                  </div>
                  <Badge tone="red">
                    {p.quantity} {p.unit}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-steel-400">
              Tous les stocks sont au-dessus du seuil. 👍
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent quotes */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-steel-900">
              Dernières demandes de devis
            </h2>
            <Link href="/admin/devis" className="text-xs font-semibold text-cobalt-600 hover:text-cobalt-700">
              Tout voir
            </Link>
          </div>
          {quotes.length > 0 ? (
            <ul className="divide-y divide-steel-100">
              {quotes.map((q: any) => {
                const s = QUOTE_STATUS[q.status as keyof typeof QUOTE_STATUS];
                return (
                  <li key={q.id}>
                    <Link
                      href={`/admin/devis/${q.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-steel-900">
                          {q.customer_name}
                          {q.company ? ` · ${q.company}` : ""}
                        </p>
                        <p className="font-mono text-xs text-steel-400">{q.ref}</p>
                      </div>
                      <Badge tone={s?.tone ?? "neutral"}>{s?.label ?? q.status}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              className="border-0 py-8"
              icon={<ClipboardList className="h-6 w-6" />}
              title="Aucune demande"
              description="Les demandes de devis du site apparaîtront ici."
            />
          )}
        </Card>

        {/* Recent sales */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-steel-900">
              Dernières ventes
            </h2>
            <Link href="/admin/ventes" className="text-xs font-semibold text-cobalt-600 hover:text-cobalt-700">
              Tout voir
            </Link>
          </div>
          {sales.length > 0 ? (
            <ul className="divide-y divide-steel-100">
              {sales.map((s: any) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-steel-900">
                      {s.customer_name || "Client comptoir"}
                    </p>
                    <p className="text-xs text-steel-400">{formatDate(s.occurred_at)}</p>
                  </div>
                  <span className={s.kind === "return" ? "text-sm font-semibold text-red-600" : "text-sm font-semibold text-steel-900"}>
                    {s.kind === "return" ? "− " : ""}
                    {formatMoney(s.total)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              className="border-0 py-8"
              icon={<Receipt className="h-6 w-6" />}
              title="Aucune vente"
              description="Enregistrez votre première vente."
              action={
                <LinkButton href="/admin/ventes/nouvelle" size="sm">
                  Nouvelle vente <ArrowRight className="h-4 w-4" />
                </LinkButton>
              }
            />
          )}
        </Card>
      </div>
    </div>
  );
}
