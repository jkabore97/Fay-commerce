"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, PackagePlus, Plus, Trash2, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/constants";
import type { Product, Supplier } from "@/lib/types";

export type PurchaseProduct = Pick<
  Product,
  "id" | "name" | "cost_price" | "unit" | "sku"
>;

interface Line {
  key: string;
  product_id: string | null;
  name: string;
  unit: string;
  quantity: string;
  unit_cost: string;
}

let counter = 0;
const nextKey = () => `line-${counter++}`;

export function PurchaseForm({
  products,
  suppliers,
}: {
  products: PurchaseProduct[];
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [lines, setLines] = useState<Line[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0].value);
  const [note, setNote] = useState("");
  const [picker, setPicker] = useState("");
  const [saving, setSaving] = useState(false);

  const availableProducts = useMemo(
    () => products.filter((p) => !lines.some((l) => l.product_id === p.id)),
    [products, lines],
  );

  const addProduct = (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    setLines((ls) => [
      ...ls,
      {
        key: nextKey(),
        product_id: product.id,
        name: product.name,
        unit: product.unit,
        quantity: "1",
        unit_cost: product.cost_price ? String(product.cost_price) : "",
      },
    ]);
    setPicker("");
  };

  const addManual = () => {
    setLines((ls) => [
      ...ls,
      {
        key: nextKey(),
        product_id: null,
        name: "",
        unit: "",
        quantity: "1",
        unit_cost: "",
      },
    ]);
  };

  const updateLine = (key: string, patch: Partial<Line>) => {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const removeLine = (key: string) => {
    setLines((ls) => ls.filter((l) => l.key !== key));
  };

  const total = lines.reduce((sum, l) => {
    const q = Number(l.quantity);
    const c = Number(l.unit_cost);
    if (Number.isNaN(q) || Number.isNaN(c)) return sum;
    return sum + q * c;
  }, 0);

  const submit = async () => {
    if (lines.length === 0) {
      toast("Ajoutez au moins une ligne à l'achat.", "error");
      return;
    }
    const payloadLines = [];
    for (const l of lines) {
      const name = l.name.trim();
      const quantity = Number(l.quantity);
      const unit_cost = Number(l.unit_cost);
      if (!l.product_id && !name) {
        toast("Chaque ligne libre a besoin d'un nom de produit.", "error");
        return;
      }
      if (Number.isNaN(quantity) || quantity <= 0) {
        toast(`Quantité invalide pour « ${name || "une ligne"} ».`, "error");
        return;
      }
      if (Number.isNaN(unit_cost) || unit_cost < 0) {
        toast(`Coût unitaire invalide pour « ${name || "une ligne"} ».`, "error");
        return;
      }
      payloadLines.push({
        product_id: l.product_id,
        name,
        quantity,
        unit_cost,
      });
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc("record_purchase", {
        p_lines: payloadLines,
        p_supplier_id: supplierId || null,
        p_method: method,
        p_note: note.trim() || null,
      });
      if (error) throw error;
      toast("Achat enregistré. Le stock a été mis à jour.", "success");
      router.push("/admin/achats");
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
        <Card className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field
              label="Ajouter un produit du catalogue"
              className="flex-1"
              hint="Le prix d'achat connu est repris par défaut."
            >
              <Select
                value={picker}
                onChange={(e) => e.target.value && addProduct(e.target.value)}
                disabled={availableProducts.length === 0}
              >
                <option value="">
                  {availableProducts.length === 0
                    ? "Tous les produits sont ajoutés"
                    : "Choisir un produit…"}
                </option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.sku ? ` (${p.sku})` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Button variant="outline" onClick={addManual} className="shrink-0">
              <Plus className="h-4 w-4" /> Ligne libre
            </Button>
          </div>

          <div className="mt-5 space-y-3">
            {lines.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-steel-200 bg-steel-50/50 px-6 py-10 text-center">
                <PackagePlus className="mb-2 h-6 w-6 text-steel-300" />
                <p className="text-sm text-steel-500">
                  Ajoutez des produits ou une ligne libre pour composer l'achat.
                </p>
              </div>
            ) : (
              lines.map((l) => {
                const q = Number(l.quantity);
                const c = Number(l.unit_cost);
                const lineTotal =
                  Number.isNaN(q) || Number.isNaN(c) ? 0 : q * c;
                return (
                  <div
                    key={l.key}
                    className="rounded-xl border border-steel-100 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {l.product_id ? (
                          <p className="font-medium text-steel-900">
                            {l.name}
                            {l.unit ? (
                              <span className="ml-1 text-xs font-normal text-steel-400">
                                / {l.unit}
                              </span>
                            ) : null}
                          </p>
                        ) : (
                          <Input
                            value={l.name}
                            onChange={(e) =>
                              updateLine(l.key, { name: e.target.value })
                            }
                            placeholder="Nom du produit (ligne libre)"
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(l.key)}
                        className="shrink-0 rounded-lg p-1.5 text-steel-400 hover:bg-red-50 hover:text-red-600"
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
                      <Field label="Coût unitaire">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          value={l.unit_cost}
                          onChange={(e) =>
                            updateLine(l.key, { unit_cost: e.target.value })
                          }
                          placeholder="0"
                        />
                      </Field>
                      <div className="col-span-2 flex items-end justify-end sm:col-span-1">
                        <div className="text-right">
                          <p className="text-xs text-steel-400">Total ligne</p>
                          <p className="tabular-nums font-semibold text-steel-900">
                            {formatMoney(lineTotal)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Summary / meta */}
      <div className="space-y-4">
        <Card className="p-5">
          <div className="space-y-4">
            <Field label="Fournisseur" hint="Optionnel.">
              <Select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">— Non précisé —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Méthode de paiement">
              <Select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
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
                placeholder="Référence du bon de livraison, remarque… (optionnel)."
              />
            </Field>

            <div className="flex items-center justify-between border-t border-steel-100 pt-4">
              <span className="text-sm font-medium text-steel-500">
                Total de l'achat
              </span>
              <span className="font-display text-xl font-bold text-steel-900 tabular-nums">
                {formatMoney(total)}
              </span>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-cobalt-50 px-3.5 py-3 text-xs text-cobalt-800">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                L'enregistrement augmente le stock des produits concernés,
                actualise leur prix d'achat et inscrit la dépense dans la
                comptabilité.
              </p>
            </div>

            <Button
              className="w-full"
              onClick={submit}
              loading={saving}
              disabled={lines.length === 0}
            >
              <Warehouse className="h-4 w-4" /> Enregistrer l'achat
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
