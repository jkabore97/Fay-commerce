"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { formatMoney, formatNumber, formatDateTime } from "@/lib/format";
import { methodLabel } from "@/lib/constants";
import type { Sale, SaleLine } from "@/lib/types";

export type SaleRow = Pick<
  Sale,
  | "id"
  | "kind"
  | "occurred_at"
  | "customer_name"
  | "total"
  | "method"
  | "note"
  | "reverses_id"
  | "quote_id"
>;

type SaleLineRow = Pick<
  SaleLine,
  "id" | "product_id" | "name" | "quantity" | "unit_price" | "line_total"
>;

export function SalesList({ sales }: { sales: SaleRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [expanded, setExpanded] = useState<string | null>(null);
  const [linesById, setLinesById] = useState<Record<string, SaleLineRow[]>>({});
  const [loadingLines, setLoadingLines] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);

  // Ids of sales that already have a return recorded (hide the Retour button).
  const reversedIds = new Set(
    sales
      .filter((s) => s.kind === "return" && s.reverses_id)
      .map((s) => s.reverses_id as string),
  );

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
        .from("sale_lines")
        .select("*")
        .eq("sale_id", id);
      if (error) throw error;
      setLinesById((m) => ({ ...m, [id]: (data as SaleLineRow[]) ?? [] }));
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

  const doReturn = async (id: string) => {
    if (
      !window.confirm(
        "Enregistrer un retour pour cette vente ? Le stock sera réintégré et l'encaissement annulé.",
      )
    ) {
      return;
    }
    setReturningId(id);
    try {
      const { error } = await supabase.rpc("record_return", { p_sale_id: id });
      if (error) throw error;
      toast("Retour enregistré.", "success");
      router.refresh();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Échec du retour.",
        "error",
      );
    } finally {
      setReturningId(null);
    }
  };

  if (sales.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="h-6 w-6" />}
        title="Aucune vente"
        description="Les ventes enregistrées apparaîtront ici."
      />
    );
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH className="w-10" />
          <TH>Date</TH>
          <TH>Client</TH>
          <TH className="hidden sm:table-cell">Méthode</TH>
          <TH className="text-right">Montant</TH>
          <TH className="text-right">Actions</TH>
        </TR>
      </THead>
      <TBody>
        {sales.map((s) => {
          const isReturn = s.kind === "return";
          const open = expanded === s.id;
          const lines = linesById[s.id];
          const canReturn = !isReturn && !reversedIds.has(s.id);
          return (
            <Fragment key={s.id}>
              <TR>
                <TD className="pr-0">
                  <button
                    type="button"
                    onClick={() => toggle(s.id)}
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
                  {formatDateTime(s.occurred_at)}
                </TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-steel-900">
                      {s.customer_name || "Client comptoir"}
                    </span>
                    {isReturn && <Badge tone="red">Retour</Badge>}
                  </div>
                  <span className="mt-0.5 block text-xs text-steel-400 sm:hidden">
                    {methodLabel(s.method)}
                  </span>
                </TD>
                <TD className="hidden sm:table-cell text-steel-600">
                  {methodLabel(s.method)}
                </TD>
                <TD className="text-right">
                  <span
                    className={
                      isReturn
                        ? "tabular-nums font-semibold text-red-600"
                        : "tabular-nums font-semibold text-steel-900"
                    }
                  >
                    {isReturn ? "− " : ""}
                    {formatMoney(s.total)}
                  </span>
                </TD>
                <TD>
                  <div className="flex justify-end">
                    {canReturn && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => doReturn(s.id)}
                        loading={returningId === s.id}
                      >
                        <RotateCcw className="h-4 w-4" /> Retour
                      </Button>
                    )}
                  </div>
                </TD>
              </TR>

              {open && (
                <TR className="hover:bg-transparent">
                  <TD colSpan={6} className="bg-steel-50/60">
                    {loadingLines === s.id ? (
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
                              {formatMoney(l.unit_price)}
                            </span>
                            <span className="w-28 whitespace-nowrap text-right tabular-nums font-medium text-steel-900">
                              {formatMoney(l.line_total)}
                            </span>
                          </div>
                        ))}
                        {s.note && (
                          <p className="border-t border-steel-200 pt-2 text-xs text-steel-500">
                            Note : {s.note}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="py-3 text-sm text-steel-500">
                        Aucune ligne pour cette vente.
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
