"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PackageSearch,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { formatMoney, formatNumber } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/constants";

export interface SaleProduct {
  id: string;
  name: string;
  sale_price: number;
  unit: string;
  quantity: number;
  sku: string | null;
}

/** Shape used to prefill lines (e.g. from a won quote). */
export interface SaleLineDraft {
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  unit?: string | null;
}

interface DraftLine {
  key: string;
  product_id: string | null;
  name: string;
  quantity: string;
  unit_price: string;
  unit: string | null;
}

const newKey = () => Math.random().toString(36).slice(2, 10);

function toDraft(line: SaleLineDraft): DraftLine {
  return {
    key: newKey(),
    product_id: line.product_id,
    name: line.name,
    quantity: String(line.quantity ?? 1),
    unit_price: String(line.unit_price ?? 0),
    unit: line.unit ?? null,
  };
}

export function SaleForm({
  products,
  initialCustomer,
  initialLines,
  quoteId,
}: {
  products: SaleProduct[];
  initialCustomer?: string;
  initialLines?: SaleLineDraft[];
  quoteId?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [lines, setLines] = useState<DraftLine[]>(
    () => initialLines?.map(toDraft) ?? [],
  );
  const [customerName, setCustomerName] = useState(initialCustomer ?? "");
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0].value);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 8);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [products, query]);

  const total = lines.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0),
    0,
  );

  const addProduct = (p: SaleProduct) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.product_id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        const q = (Number(next[idx].quantity) || 0) + 1;
        next[idx] = { ...next[idx], quantity: String(q) };
        return next;
      }
      return [
        ...prev,
        {
          key: newKey(),
          product_id: p.id,
          name: p.name,
          quantity: "1",
          unit_price: String(p.sale_price ?? 0),
          unit: p.unit,
        },
      ];
    });
    setQuery("");
    setOpen(false);
    searchRef.current?.focus();
  };

  const addManual = () => {
    setLines((prev) => [
      ...prev,
      {
        key: newKey(),
        product_id: null,
        name: "",
        quantity: "1",
        unit_price: "0",
        unit: null,
      },
    ]);
  };

  const updateLine = (key: string, patch: Partial<DraftLine>) =>
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );

  const removeLine = (key: string) =>
    setLines((prev) => prev.filter((l) => l.key !== key));

  const submit = async () => {
    if (lines.length === 0) {
      toast("Ajoutez au moins une ligne à la vente.", "error");
      return;
    }
    const payload: SaleLineDraft[] = [];
    for (const l of lines) {
      const name = l.name.trim();
      const qty = Number(l.quantity);
      const price = Number(l.unit_price);
      if (!name) {
        toast("Chaque ligne a besoin d'un nom d'article.", "error");
        return;
      }
      if (!(qty > 0)) {
        toast(`Quantité invalide pour « ${name} ».`, "error");
        return;
      }
      if (!(price >= 0) || Number.isNaN(price)) {
        toast(`Prix invalide pour « ${name} ».`, "error");
        return;
      }
      payload.push({
        product_id: l.product_id,
        name,
        quantity: qty,
        unit_price: price,
      });
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc("record_sale", {
        p_lines: payload,
        p_customer_name: customerName.trim() || null,
        p_method: method,
        p_note: note.trim() || null,
        p_quote_id: quoteId ?? null,
      });
      if (error) throw error;
      toast("Vente enregistrée.", "success");
      router.push("/admin/ventes");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Échec de l'enregistrement.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Lines */}
      <div className="space-y-4 lg:col-span-2">
        <div className="card p-4 sm:p-5">
          <Label>Ajouter un produit</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 120)}
                placeholder="Rechercher par nom ou référence…"
                className="pl-9"
              />
              {open && matches.length > 0 && (
                <div className="thin-scroll absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-steel-200 bg-white py-1 shadow-lg">
                  {matches.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addProduct(p);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-steel-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-steel-900">
                          {p.name}
                        </span>
                        <span className="block truncate text-xs text-steel-400">
                          {p.sku ? `${p.sku} · ` : ""}
                          {formatNumber(p.quantity)} {p.unit} en stock
                        </span>
                      </span>
                      <span className="whitespace-nowrap text-sm font-semibold text-brass-700">
                        {formatMoney(p.sale_price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button type="button" variant="outline" onClick={addManual}>
              <Plus className="h-4 w-4" /> Ligne libre
            </Button>
          </div>
        </div>

        {lines.length > 0 ? (
          <div className="space-y-3">
            {lines.map((l) => {
              const lineTotal =
                (Number(l.quantity) || 0) * (Number(l.unit_price) || 0);
              return (
                <div
                  key={l.key}
                  className="rounded-2xl border border-steel-200 bg-white p-3 shadow-sm sm:p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {l.product_id ? (
                        <p className="font-medium text-steel-900">
                          {l.name}
                          {l.unit && (
                            <span className="text-steel-400"> / {l.unit}</span>
                          )}
                        </p>
                      ) : (
                        <Input
                          value={l.name}
                          onChange={(e) =>
                            updateLine(l.key, { name: e.target.value })
                          }
                          placeholder="Nom de l'article"
                          aria-label="Nom de l'article"
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(l.key)}
                      className="rounded-lg p-1.5 text-steel-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Retirer la ligne"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Field label="Quantité">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        value={l.quantity}
                        onChange={(e) =>
                          updateLine(l.key, { quantity: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Prix unitaire">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="any"
                        value={l.unit_price}
                        onChange={(e) =>
                          updateLine(l.key, { unit_price: e.target.value })
                        }
                      />
                    </Field>
                    <div className="col-span-2 flex flex-col justify-end sm:col-span-1">
                      <span className="mb-1.5 block text-sm font-medium text-steel-700">
                        Total ligne
                      </span>
                      <span className="flex h-11 items-center justify-end rounded-xl bg-steel-50 px-3.5 text-sm font-semibold tabular-nums text-steel-900">
                        {formatMoney(lineTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<PackageSearch className="h-6 w-6" />}
            title="Aucune ligne"
            description="Recherchez un produit ci-dessus ou ajoutez une ligne libre pour commencer."
          />
        )}
      </div>

      {/* Recap / details */}
      <div className="space-y-4">
        <div className="card space-y-4 p-4 sm:p-5">
          <Field label="Client">
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Client comptoir"
            />
          </Field>
          <Field label="Méthode de paiement" required>
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Note">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note interne sur la vente (facultatif)."
            />
          </Field>
        </div>

        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-steel-500">Total</span>
            <span className="font-display text-2xl font-bold tabular-nums text-steel-900">
              {formatMoney(total)}
            </span>
          </div>
          <p className="mt-1 text-xs text-steel-400">
            {lines.length} ligne{lines.length > 1 ? "s" : ""}
            {quoteId ? " · issue d'un devis" : ""}
          </p>
          <Button
            type="button"
            className="mt-4 w-full"
            size="lg"
            onClick={submit}
            loading={saving}
            disabled={lines.length === 0}
          >
            {saving ? (
              "Enregistrement…"
            ) : (
              <>
                <Receipt className="h-4 w-4" /> Enregistrer la vente
              </>
            )}
          </Button>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-steel-400">
          <ShoppingCart className="h-3.5 w-3.5" />
          Le stock et la caisse sont mis à jour automatiquement.
        </p>
      </div>
    </div>
  );
}
