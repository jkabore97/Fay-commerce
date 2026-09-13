"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  PackageSearch,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { formatMoney, formatNumber, formatDateTime } from "@/lib/format";
import { STOCK_KIND } from "@/lib/constants";
import type { Product, StockMovement, StockMovementKind } from "@/lib/types";

export type StockProduct = Pick<
  Product,
  "id" | "name" | "sku" | "unit" | "quantity" | "low_stock_at" | "cost_price" | "is_active"
>;

export type StockMovementRow = StockMovement & {
  products: Pick<Product, "name" | "sku" | "unit"> | null;
};

// Only these two kinds are valid for a manual correction (see adjust_stock).
const ADJUST_KINDS: StockMovementKind[] = ["adjustment", "opening"];

interface AdjustForm {
  delta: string;
  kind: StockMovementKind;
  note: string;
}

const EMPTY_ADJUST: AdjustForm = { delta: "", kind: "adjustment", note: "" };

export function StockManager({
  products,
  movements,
  isAdmin,
}: {
  products: StockProduct[];
  movements: StockMovementRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [adjusting, setAdjusting] = useState<StockProduct | null>(null);
  const [form, setForm] = useState<AdjustForm>(EMPTY_ADJUST);
  const [saving, setSaving] = useState(false);

  const openAdjust = (p: StockProduct) => {
    setAdjusting(p);
    setForm(EMPTY_ADJUST);
  };

  const closeAdjust = () => {
    if (!saving) setAdjusting(null);
  };

  const deltaNum = Number(form.delta);
  const deltaValid =
    form.delta.trim() !== "" && !Number.isNaN(deltaNum) && deltaNum !== 0;
  const nextQty =
    adjusting != null
      ? adjusting.quantity + (Number.isNaN(deltaNum) ? 0 : deltaNum)
      : 0;

  const submitAdjust = async () => {
    if (!adjusting) return;
    if (!deltaValid) {
      toast("Saisissez une quantité non nulle (positive ou négative).", "error");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("adjust_stock", {
        p_product_id: adjusting.id,
        p_delta: deltaNum,
        p_kind: form.kind,
        p_note: form.note.trim() || null,
      });
      if (error) throw error;
      setAdjusting(null);
      toast("Stock ajusté.", "success");
      router.refresh();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Échec de l'ajustement.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Products */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-steel-900">
            Produits en stock
          </h2>
          <p className="text-sm text-steel-500">
            {products.length} produit{products.length > 1 ? "s" : ""}
          </p>
        </div>

        {products.length > 0 ? (
          <Table>
            <THead>
              <TR>
                <TH>Produit</TH>
                <TH className="text-center">Stock actuel</TH>
                <TH className="text-center">Seuil d'alerte</TH>
                {isAdmin && <TH className="text-right">Prix d'achat</TH>}
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {products.map((p) => {
                const isLow =
                  p.low_stock_at != null && p.quantity <= p.low_stock_at;
                return (
                  <TR key={p.id}>
                    <TD>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-steel-900">
                            {p.name}
                          </span>
                          {!p.is_active && (
                            <Badge tone="neutral">Inactif</Badge>
                          )}
                        </div>
                        {p.sku && (
                          <p className="font-mono text-xs text-steel-400">
                            {p.sku}
                          </p>
                        )}
                      </div>
                    </TD>
                    <TD className="text-center">
                      {isLow ? (
                        <Badge tone="red">
                          <AlertTriangle className="h-3 w-3" />
                          {formatNumber(p.quantity)} {p.unit}
                        </Badge>
                      ) : (
                        <span className="tabular-nums font-medium text-steel-800">
                          {formatNumber(p.quantity)} {p.unit}
                        </span>
                      )}
                    </TD>
                    <TD className="text-center">
                      <ThresholdCell product={p} />
                    </TD>
                    {isAdmin && (
                      <TD className="text-right tabular-nums">
                        {formatMoney(p.cost_price)}
                      </TD>
                    )}
                    <TD>
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAdjust(p)}
                        >
                          <SlidersHorizontal className="h-4 w-4" /> Ajuster
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<PackageSearch className="h-6 w-6" />}
            title="Aucun produit"
            description="Ajoutez des produits au catalogue pour gérer leur stock ici."
          />
        )}
      </section>

      {/* Recent movements */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-steel-900">
          Mouvements récents
        </h2>

        {movements.length > 0 ? (
          <Table>
            <THead>
              <TR>
                <TH>Produit</TH>
                <TH>Type</TH>
                <TH className="text-center">Quantité</TH>
                {isAdmin && <TH className="text-right">Coût unitaire</TH>}
                <TH className="hidden md:table-cell">Note</TH>
                <TH className="text-right">Date</TH>
              </TR>
            </THead>
            <TBody>
              {movements.map((m) => {
                const k = STOCK_KIND[m.kind];
                const positive = m.quantity > 0;
                const negative = m.quantity < 0;
                const unit = m.products?.unit ?? "";
                return (
                  <TR key={m.id}>
                    <TD>
                      <div className="min-w-0">
                        <span className="font-medium text-steel-900">
                          {m.products?.name ?? "Produit supprimé"}
                        </span>
                        {m.products?.sku && (
                          <p className="font-mono text-xs text-steel-400">
                            {m.products.sku}
                          </p>
                        )}
                      </div>
                    </TD>
                    <TD>
                      <Badge tone={k?.tone ?? "neutral"}>
                        {k?.label ?? m.kind}
                      </Badge>
                    </TD>
                    <TD className="text-center">
                      <span
                        className={
                          positive
                            ? "tabular-nums font-semibold text-emerald-600"
                            : negative
                              ? "tabular-nums font-semibold text-red-600"
                              : "tabular-nums font-medium text-steel-700"
                        }
                      >
                        {positive ? "+" : negative ? "−" : ""}
                        {formatNumber(Math.abs(m.quantity))} {unit}
                      </span>
                    </TD>
                    {isAdmin && (
                      <TD className="text-right tabular-nums">
                        {m.unit_cost != null ? formatMoney(m.unit_cost) : "—"}
                      </TD>
                    )}
                    <TD className="hidden max-w-xs md:table-cell">
                      <span className="block truncate text-steel-500">
                        {m.note || "—"}
                      </span>
                    </TD>
                    <TD className="whitespace-nowrap text-right text-steel-500">
                      {formatDateTime(m.created_at)}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<ArrowLeftRight className="h-6 w-6" />}
            title="Aucun mouvement"
            description="Les réceptions, ventes et corrections de stock apparaîtront ici."
          />
        )}
      </section>

      {/* Adjust modal */}
      <Modal
        open={adjusting !== null}
        onClose={closeAdjust}
        title="Ajuster le stock"
        description={adjusting?.name}
        footer={
          <>
            <Button variant="outline" onClick={closeAdjust} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={submitAdjust} loading={saving} disabled={!deltaValid}>
              Enregistrer
            </Button>
          </>
        }
      >
        {adjusting && (
          <div className="space-y-4">
            <div className="rounded-xl border border-steel-100 bg-steel-50/60 px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-steel-500">Stock actuel</span>
                <span className="font-semibold text-steel-900 tabular-nums">
                  {formatNumber(adjusting.quantity)} {adjusting.unit}
                </span>
              </div>
              {deltaValid && (
                <div className="mt-1.5 flex items-center justify-between border-t border-steel-100 pt-1.5">
                  <span className="text-steel-500">Après ajustement</span>
                  <span
                    className={
                      nextQty < 0
                        ? "font-semibold text-red-600 tabular-nums"
                        : "font-semibold text-steel-900 tabular-nums"
                    }
                  >
                    {formatNumber(nextQty)} {adjusting.unit}
                  </span>
                </div>
              )}
            </div>

            <Field
              label="Quantité"
              required
              hint="Nombre positif pour ajouter, négatif pour retirer du stock."
            >
              <Input
                type="number"
                inputMode="numeric"
                value={form.delta}
                onChange={(e) =>
                  setForm((f) => ({ ...f, delta: e.target.value }))
                }
                placeholder="Ex. -5"
              />
            </Field>

            <Field label="Type de mouvement" required>
              <Select
                value={form.kind}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    kind: e.target.value as StockMovementKind,
                  }))
                }
              >
                {ADJUST_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {STOCK_KIND[k].label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Note">
              <Textarea
                value={form.note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
                }
                placeholder="Motif de la correction (recomptage, casse, stock initial…)."
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** Inline editor for a product's low-stock threshold (products.low_stock_at). */
function ThresholdCell({ product }: { product: StockProduct }) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const original = product.low_stock_at == null ? "" : String(product.low_stock_at);
  const [value, setValue] = useState(original);
  const [saving, setSaving] = useState(false);

  const dirty = value.trim() !== original;

  const save = async () => {
    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : Number.parseInt(trimmed, 10);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) {
      toast("Seuil invalide.", "error");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({ low_stock_at: parsed })
        .eq("id", product.id);
      if (error) throw error;
      toast("Seuil mis à jour.", "success");
      router.refresh();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Échec de la mise à jour.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-1.5">
      <Input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && dirty) save();
        }}
        placeholder="—"
        className="h-9 w-20 px-2 text-center"
        aria-label={`Seuil d'alerte pour ${product.name}`}
      />
      {dirty && (
        <Button
          variant="ghost"
          size="sm"
          onClick={save}
          loading={saving}
          className="px-2"
          title="Enregistrer le seuil"
        >
          <Check className="h-4 w-4" />
          <span className="sr-only">Enregistrer</span>
        </Button>
      )}
    </div>
  );
}
