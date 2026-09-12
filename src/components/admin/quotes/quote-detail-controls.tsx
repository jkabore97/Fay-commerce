"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { formatMoney, formatDateTime } from "@/lib/format";
import { QUOTE_STATUS, QUOTE_STATUS_ORDER } from "@/lib/constants";
import type { QuoteRequest, QuoteStatus } from "@/lib/types";

export function QuoteDetailControls({
  quote,
  isAdmin,
}: {
  quote: Pick<
    QuoteRequest,
    "id" | "status" | "note" | "quoted_total" | "quoted_at"
  >;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [status, setStatus] = useState<QuoteStatus>(quote.status);
  const [quotedTotal, setQuotedTotal] = useState(
    quote.quoted_total == null ? "" : String(quote.quoted_total),
  );
  const [note, setNote] = useState(quote.note ?? "");
  const [saving, setSaving] = useState(false);

  const current = QUOTE_STATUS[quote.status];

  const dirty =
    status !== quote.status ||
    note.trim() !== (quote.note ?? "").trim() ||
    quotedTotal.trim() !==
      (quote.quoted_total == null ? "" : String(quote.quoted_total));

  const save = async () => {
    const trimmed = quotedTotal.trim();
    let parsedTotal: number | null = null;
    if (trimmed !== "") {
      parsedTotal = Number(trimmed);
      if (Number.isNaN(parsedTotal) || parsedTotal < 0) {
        toast("Montant du devis invalide.", "error");
        return;
      }
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("update_quote", {
        p_id: quote.id,
        p_status: status,
        p_note: note.trim() || null,
        p_quoted_total: parsedTotal,
      });
      if (error) throw error;
      toast("Demande mise à jour.", "success");
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
    <Card className="space-y-5 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold text-steel-900">
          Traitement
        </h2>
        <Badge tone={current?.tone ?? "neutral"}>
          {current?.label ?? quote.status}
        </Badge>
      </div>

      {(quote.quoted_total != null || quote.quoted_at) && (
        <div className="rounded-xl border border-steel-100 bg-steel-50/60 px-4 py-3 text-sm">
          {quote.quoted_total != null && (
            <div className="flex items-center justify-between">
              <span className="text-steel-500">Montant devisé</span>
              <span className="font-semibold tabular-nums text-steel-900">
                {formatMoney(quote.quoted_total)}
              </span>
            </div>
          )}
          {quote.quoted_at && (
            <div className="mt-1.5 flex items-center justify-between border-t border-steel-100 pt-1.5">
              <span className="text-steel-500">Devis envoyé le</span>
              <span className="text-steel-700">
                {formatDateTime(quote.quoted_at)}
              </span>
            </div>
          )}
        </div>
      )}

      <Field label="Statut">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as QuoteStatus)}
        >
          {QUOTE_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {QUOTE_STATUS[s].label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Montant du devis"
        hint="Total proposé au client (optionnel). L'enregistrer marque la date d'envoi du devis."
      >
        <Input
          type="number"
          inputMode="numeric"
          min="0"
          value={quotedTotal}
          onChange={(e) => setQuotedTotal(e.target.value)}
          placeholder="Ex. 250000"
        />
      </Field>

      <Field label="Note interne" hint="Visible par le personnel uniquement.">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Suivi, conditions, relance…"
        />
      </Field>

      <Button
        onClick={save}
        loading={saving}
        disabled={!dirty}
        className="w-full"
      >
        <Save className="h-4 w-4" /> Enregistrer
      </Button>
    </Card>
  );
}
