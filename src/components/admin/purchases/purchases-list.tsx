"use client";

import { Fragment, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Truck,
} from "lucide-react";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { formatMoney, formatNumber, formatDateTime } from "@/lib/format";
import { methodLabel } from "@/lib/constants";
import type { Purchase, PurchaseLine } from "@/lib/types";

export type PurchaseRow = Pick<
  Purchase,
  "id" | "supplier_id" | "occurred_at" | "total" | "method" | "note"
> & {
  suppliers: { name: string } | null;
};

type PurchaseLineRow = Pick<
  PurchaseLine,
  "id" | "product_id" | "name" | "quantity" | "unit_cost" | "line_total"
>;

export function PurchasesList({ purchases }: { purchases: PurchaseRow[] }) {
  const { toast } = useToast();
  const supabase = createClient();

  const [expanded, setExpanded] = useState<string | null>(null);
  const [linesById, setLinesById] = useState<Record<string, PurchaseLineRow[]>>(
    {},
  );
  const [loadingLines, setLoadingLines] = useState<string | null>(null);

  const toggle = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (linesById[id]) return;
    setLoadingLines(id);
    try {
      const { data, error } = await supabase
        .from("purchase_lines")
        .select("*")
        .eq("purchase_id", id);
      if (error) throw error;
      setLinesById((m) => ({ ...m, [id]: (data as PurchaseLineRow[]) ?? [] }));
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Échec du chargement du détail.",
        "error",
      );
      setExpanded(null);
    } finally {
      setLoadingLines(null);
    }
  };

  if (purchases.length === 0) {
    return (
      <EmptyState
        icon={<Truck className="h-6 w-6" />}
        title="Aucun achat"
        description="Les réceptions de marchandise enregistrées apparaîtront ici."
      />
    );
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH className="w-10" />
          <TH>Date</TH>
          <TH>Fournisseur</TH>
          <TH className="hidden sm:table-cell">Méthode</TH>
          <TH className="text-right">Montant</TH>
        </TR>
      </THead>
      <TBody>
        {purchases.map((p) => {
          const open = expanded === p.id;
          const lines = linesById[p.id];
          return (
            <Fragment key={p.id}>
              <TR>
                <TD className="pr-0">
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    className="rounded-lg p-1.5 text-steel-500 hover:bg-steel-100 hover:text-steel-800"
                    aria-label={open ? "Masquer le détail" : "Voir le détail"}
                    aria-expanded={open}
                  >
                    {open ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                </TD>
                <TD className="whitespace-nowrap text-steel-500">
                  {formatDateTime(p.occurred_at)}
                </TD>
                <TD>
                  <span className="font-medium text-steel-900">
                    {p.suppliers?.name || "—"}
                  </span>
                  <span className="mt-0.5 block text-xs text-steel-400 sm:hidden">
                    {methodLabel(p.method)}
                  </span>
                </TD>
                <TD className="hidden sm:table-cell text-steel-600">
                  {methodLabel(p.method)}
                </TD>
                <TD className="text-right">
                  <span className="tabular-nums font-semibold text-steel-900">
                    {formatMoney(p.total)}
                  </span>
                </TD>
              </TR>

              {open && (
                <TR className="hover:bg-transparent">
                  <TD colSpan={5} className="bg-steel-50/60">
                    {loadingLines === p.id ? (
                      <div className="flex items-center gap-2 py-3 text-sm text-steel-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Chargement du détail…
                      </div>
                    ) : lines && lines.length > 0 ? (
                      <div className="space-y-2 py-1">
                        {lines.map((l) => (
                          <div
                            key={l.id}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <span className="min-w-0 flex-1 truncate text-steel-800">
                              {l.name}
                            </span>
                            <span className="whitespace-nowrap tabular-nums text-steel-500">
                              {formatNumber(l.quantity)} ×{" "}
                              {formatMoney(l.unit_cost)}
                            </span>
                            <span className="w-28 whitespace-nowrap text-right tabular-nums font-medium text-steel-900">
                              {formatMoney(l.line_total)}
                            </span>
                          </div>
                        ))}
                        {p.note && (
                          <p className="border-t border-steel-200 pt-2 text-xs text-steel-500">
                            Note : {p.note}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="py-3 text-sm text-steel-500">
                        Aucune ligne pour cet achat.
                      </p>
                    )}
                  </TD>
                </TR>
              )}
            </Fragment>
          );
        })}
      </TBody>
    </Table>
  );
}
