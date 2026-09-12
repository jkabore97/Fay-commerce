"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Check, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { PAYMENT_METHODS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Mode = "entry" | "transfer";

/**
 * Records a manual journal entry (record_entry) or a transfer between two cash
 * accounts (record_transfer). Both RPCs are admin-only; RLS enforces that.
 */
export function EntryForm({ onSuccess }: { onSuccess: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("entry");
  const [saving, setSaving] = useState(false);

  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"out" | "in">("out");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("");
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0].value);
  const [fromMethod, setFromMethod] = useState<string>(PAYMENT_METHODS[0].value);
  const [toMethod, setToMethod] = useState<string>(PAYMENT_METHODS[1].value);
  const [memo, setMemo] = useState("");

  const amountNum = Number(amount);
  const amountValid =
    amount.trim() !== "" && !Number.isNaN(amountNum) && amountNum > 0;

  const submit = async () => {
    if (!amountValid) {
      toast("Saisissez un montant supérieur à zéro.", "error");
      return;
    }
    if (mode === "entry" && !label.trim()) {
      toast("Le libellé est obligatoire.", "error");
      return;
    }
    if (mode === "transfer" && fromMethod === toMethod) {
      toast("Choisissez deux comptes différents pour le transfert.", "error");
      return;
    }

    setSaving(true);
    try {
      if (mode === "entry") {
        const { error } = await supabase.rpc("record_entry", {
          p_amount: amountNum,
          p_direction: direction,
          p_label: label.trim(),
          p_category: category.trim() || null,
          p_method: method,
          p_memo: memo.trim() || null,
        });
        if (error) throw error;
        toast(
          direction === "in" ? "Recette enregistrée." : "Dépense enregistrée.",
          "success",
        );
      } else {
        const { error } = await supabase.rpc("record_transfer", {
          p_amount: amountNum,
          p_from_method: fromMethod,
          p_to_method: toMethod,
          p_label: label.trim() || null,
          p_memo: memo.trim() || null,
        });
        if (error) throw error;
        toast("Transfert enregistré.", "success");
      }
      router.refresh();
      onSuccess();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Échec de l'enregistrement.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const modes: [Mode, string, typeof Wallet][] = [
    ["entry", "Écriture", Wallet],
    ["transfer", "Transfert", ArrowLeftRight],
  ];

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="inline-flex rounded-xl border border-steel-200 bg-steel-50 p-1">
        {modes.map(([m, l, Icon]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              mode === m
                ? "bg-white text-steel-900 shadow-sm"
                : "text-steel-500 hover:text-steel-700",
            )}
          >
            <Icon className="h-4 w-4" /> {l}
          </button>
        ))}
      </div>

      <Field label="Montant" required>
        <Input
          type="number"
          inputMode="numeric"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Ex. 25 000"
        />
      </Field>

      {mode === "entry" ? (
        <>
          <Field label="Type" required>
            <Select
              value={direction}
              onChange={(e) => setDirection(e.target.value as "out" | "in")}
            >
              <option value="out">Dépense</option>
              <option value="in">Recette</option>
            </Select>
          </Field>

          <Field label="Libellé" required>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex. Achat de fournitures"
            />
          </Field>

          <Field
            label="Catégorie / compte"
            hint="Compte de produit ou de charge (créé automatiquement s'il n'existe pas)."
          >
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex. Transport, Loyer, Ventes…"
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
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Depuis" required>
              <Select
                value={fromMethod}
                onChange={(e) => setFromMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Vers" required>
              <Select
                value={toMethod}
                onChange={(e) => setToMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Libellé">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex. Dépôt en banque"
            />
          </Field>
        </>
      )}

      <Field label="Mémo">
        <Textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Détail interne (facultatif)."
        />
      </Field>

      <Button
        type="button"
        className="w-full"
        size="lg"
        onClick={submit}
        loading={saving}
        disabled={!amountValid}
      >
        <Check className="h-4 w-4" /> Enregistrer
      </Button>
    </div>
  );
}
