import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, Receipt } from "lucide-react";
import { PageHeader, Card, EmptyState } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { QuoteDetailControls } from "@/components/admin/quotes/quote-detail-controls";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { QuoteItem, QuoteRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DevisDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const staff = await requireStaff();
  const isAdmin = staff.role === "admin";
  const supabase = createClient();

  const { data: quoteData } = await supabase
    .from("quote_requests")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!quoteData) notFound();
  const q = quoteData as QuoteRequest;

  const { data: itemsData } = await supabase
    .from("quote_items")
    .select("*")
    .eq("quote_id", params.id);

  const items = (itemsData as QuoteItem[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Demande ${q.ref}`}
        description={q.company ? `${q.customer_name} · ${q.company}` : q.customer_name}
        actions={
          <>
            <LinkButton href="/admin/devis" variant="outline">
              <ArrowLeft className="h-4 w-4" /> Retour
            </LinkButton>
            <LinkButton href={`/admin/ventes/nouvelle?quote=${q.id}`}>
              <Receipt className="h-4 w-4" /> Convertir en vente
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left — customer + requested items */}
        <Card className="space-y-6 p-5 lg:col-span-2">
          <div>
            <h2 className="font-display text-base font-bold text-steel-900">
              Coordonnées
            </h2>
            <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Info label="Client">{q.customer_name}</Info>
              <Info label="Société">{q.company || "—"}</Info>
              <Info label="Téléphone">
                <a
                  href={`tel:${q.phone}`}
                  className="font-medium text-brass-700 hover:text-brass-800"
                >
                  {q.phone}
                </a>
              </Info>
              <Info label="Email">
                {q.email ? (
                  <a
                    href={`mailto:${q.email}`}
                    className="break-all font-medium text-brass-700 hover:text-brass-800"
                  >
                    {q.email}
                  </a>
                ) : (
                  "—"
                )}
              </Info>
              <Info label="Reçue le">{formatDateTime(q.created_at)}</Info>
              {q.quoted_at && (
                <Info label="Devis envoyé le">
                  {formatDateTime(q.quoted_at)}
                </Info>
              )}
            </dl>

            {q.message && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-steel-500">
                  Message du client
                </p>
                <p className="mt-1.5 whitespace-pre-line rounded-xl border border-steel-100 bg-steel-50/60 px-4 py-3 text-sm text-steel-700">
                  {q.message}
                </p>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-display text-base font-bold text-steel-900">
              Articles demandés
            </h3>
            {items.length > 0 ? (
              <div className="mt-4">
                <Table>
                  <THead>
                    <TR>
                      <TH>Produit</TH>
                      <TH className="text-center">Quantité</TH>
                      <TH className="hidden sm:table-cell">Unité</TH>
                      <TH className="hidden md:table-cell">Note</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {items.map((it) => (
                      <TR key={it.id}>
                        <TD className="font-medium text-steel-900">
                          {it.name}
                        </TD>
                        <TD className="text-center tabular-nums">
                          {formatNumber(it.quantity)}
                        </TD>
                        <TD className="hidden text-steel-600 sm:table-cell">
                          {it.unit || "—"}
                        </TD>
                        <TD className="hidden text-steel-500 md:table-cell">
                          {it.note || "—"}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                className="mt-4 border-0 py-8"
                icon={<ClipboardList className="h-6 w-6" />}
                title="Aucun article"
                description="Cette demande ne comporte pas d'article détaillé."
              />
            )}
          </div>
        </Card>

        {/* Right — working controls */}
        <QuoteDetailControls quote={q} isAdmin={isAdmin} />
      </div>
    </div>
  );
}

function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-steel-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-steel-800">{children}</dd>
    </div>
  );
}
