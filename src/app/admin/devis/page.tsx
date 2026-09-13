import Link from "next/link";
import { ChevronRight, ClipboardList } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/primitives";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { QUOTE_STATUS, QUOTE_STATUS_ORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { QuoteRequest, QuoteStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type QuoteListRow = Pick<
  QuoteRequest,
  "id" | "ref" | "status" | "customer_name" | "company" | "phone" | "created_at"
>;

export default async function DevisPage({
  searchParams,
}: {
  searchParams: { statut?: string };
}) {
  await requireStaff();
  const supabase = createClient();

  const active = QUOTE_STATUS_ORDER.includes(
    searchParams.statut as QuoteStatus,
  )
    ? (searchParams.statut as QuoteStatus)
    : null;

  let query = supabase
    .from("quote_requests")
    .select("id, ref, status, customer_name, company, phone, created_at");
  if (active) query = query.eq("status", active);
  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(200);

  const quotes = (data as QuoteListRow[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demandes de devis"
        description="Suivez les demandes reçues depuis le site, traitez-les et convertissez-les en ventes."
      />

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        <FilterChip href="/admin/devis" active={!active}>
          Tous
        </FilterChip>
        {QUOTE_STATUS_ORDER.map((s) => (
          <FilterChip
            key={s}
            href={`/admin/devis?statut=${s}`}
            active={active === s}
          >
            {QUOTE_STATUS[s].label}
          </FilterChip>
        ))}
      </div>

      {quotes.length > 0 ? (
        <Table>
          <THead>
            <TR>
              <TH>Réf.</TH>
              <TH>Client</TH>
              <TH className="hidden sm:table-cell">Téléphone</TH>
              <TH>Statut</TH>
              <TH className="text-right">Date</TH>
              <TH className="w-10" />
            </TR>
          </THead>
          <TBody>
            {quotes.map((q) => {
              const s = QUOTE_STATUS[q.status];
              return (
                <TR key={q.id}>
                  <TD>
                    <Link
                      href={`/admin/devis/${q.id}`}
                      className="font-mono text-sm font-semibold text-cobalt-700 hover:text-cobalt-800"
                    >
                      {q.ref}
                    </Link>
                  </TD>
                  <TD>
                    <div className="min-w-0">
                      <span className="font-medium text-steel-900">
                        {q.customer_name}
                      </span>
                      {q.company && (
                        <p className="truncate text-xs text-steel-400">
                          {q.company}
                        </p>
                      )}
                    </div>
                    <span className="mt-0.5 block text-xs text-steel-400 sm:hidden">
                      {q.phone}
                    </span>
                  </TD>
                  <TD className="hidden text-steel-600 sm:table-cell">
                    {q.phone}
                  </TD>
                  <TD>
                    <Badge tone={s?.tone ?? "neutral"}>
                      {s?.label ?? q.status}
                    </Badge>
                  </TD>
                  <TD className="whitespace-nowrap text-right text-steel-500">
                    {formatDate(q.created_at)}
                  </TD>
                  <TD className="text-right">
                    <Link
                      href={`/admin/devis/${q.id}`}
                      className="inline-flex rounded-lg p-1.5 text-steel-400 hover:bg-steel-100 hover:text-steel-700"
                      aria-label={`Ouvrir la demande ${q.ref}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      ) : (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="Aucune demande"
          description={
            active
              ? "Aucune demande avec ce statut pour le moment."
              : "Les demandes de devis envoyées depuis le site apparaîtront ici."
          }
        />
      )}
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
        active
          ? "bg-cobalt-500 text-white shadow-sm"
          : "border border-steel-200 bg-white text-steel-600 hover:border-steel-300 hover:bg-steel-50",
      )}
    >
      {children}
    </Link>
  );
}
