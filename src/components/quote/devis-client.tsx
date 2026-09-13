"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  FileText,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { ProductImage } from "@/components/site/product-image";
import { useQuote } from "./quote-context";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export function DevisClient() {
  const { items, setQty, remove, clear } = useQuote();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [extra, setExtra] = useState("");
  const [manual, setManual] = useState<{ name: string; quantity: number }[]>([]);

  const [form, setForm] = useState({
    customer_name: "",
    company: "",
    phone: "",
    email: "",
    message: "",
  });

  const allItems = [
    ...items.map((i) => ({
      product_id: i.product_id,
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
    })),
    ...manual.map((m) => ({
      product_id: null,
      name: m.name,
      quantity: m.quantity,
      unit: null,
    })),
  ];

  const addManual = () => {
    const name = extra.trim();
    if (!name) return;
    setManual((m) => [...m, { name, quantity: 1 }]);
    setExtra("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (allItems.length === 0) {
      toast("Ajoutez au moins un produit à votre demande.", "error");
      return;
    }
    if (!form.customer_name.trim() || !form.phone.trim()) {
      toast("Le nom et le téléphone sont requis.", "error");
      return;
    }
    if (!isSupabaseConfigured()) {
      toast(
        "Le service de devis n'est pas encore connecté. Contactez-nous par téléphone.",
        "error",
      );
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("submit_quote_request", {
        p_payload: { ...form, items: allItems },
      });
      if (error) throw error;
      setReference(data as string);
      clear();
      setManual([]);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Échec de l'envoi. Réessayez.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (reference) {
    return (
      <div className="mx-auto max-w-xl py-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h2 className="mt-6 font-display text-2xl font-bold text-steel-900">
          Demande envoyée !
        </h2>
        <p className="mt-2 text-steel-600">
          Merci. Votre demande de devis a bien été enregistrée sous la référence
        </p>
        <p className="mt-3 inline-block rounded-xl bg-steel-900 px-5 py-2 font-mono text-lg font-bold text-cobalt-400">
          {reference}
        </p>
        <p className="mt-4 text-sm text-steel-500">
          Notre équipe vous recontacte sous 24h avec une offre chiffrée.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/catalogue">
            <Button variant="outline">Continuer mes achats</Button>
          </Link>
          <Link href="/">
            <Button>Retour à l'accueil</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart className="h-7 w-7" />}
        title="Votre demande est vide"
        description="Parcourez le catalogue et ajoutez les produits qui vous intéressent pour recevoir un devis chiffré."
        action={
          <Link href="/catalogue">
            <Button>Parcourir le catalogue</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      {/* Basket */}
      <div className="lg:col-span-3">
        <h2 className="font-display text-lg font-bold text-steel-900">
          Produits demandés ({allItems.length})
        </h2>
        <div className="mt-4 space-y-3">
          {items.map((i) => (
            <div
              key={i.slug}
              className="flex items-center gap-4 rounded-2xl border border-steel-100 bg-white p-3 shadow-card"
            >
              <ProductImage
                src={i.image_url}
                alt={i.name}
                className="h-16 w-16 shrink-0"
                rounded="rounded-xl"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-steel-900">{i.name}</p>
                {i.unit && (
                  <p className="text-xs capitalize text-steel-500">Unité : {i.unit}</p>
                )}
              </div>
              <div className="inline-flex h-10 items-center rounded-xl border border-steel-200">
                <button
                  type="button"
                  onClick={() => setQty(i.slug, i.quantity - 1)}
                  className="flex h-full w-9 items-center justify-center text-steel-500 hover:text-steel-900"
                  aria-label="Diminuer"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  value={i.quantity}
                  onChange={(e) =>
                    setQty(i.slug, Math.max(1, parseInt(e.target.value || "1", 10)))
                  }
                  className="h-full w-12 border-x border-steel-200 text-center text-sm font-semibold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQty(i.slug, i.quantity + 1)}
                  className="flex h-full w-9 items-center justify-center text-steel-500 hover:text-steel-900"
                  aria-label="Augmenter"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={() => remove(i.slug)}
                className="rounded-lg p-2 text-steel-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Retirer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {manual.map((m, idx) => (
            <div
              key={`m-${idx}`}
              className="flex items-center gap-4 rounded-2xl border border-dashed border-steel-200 bg-white p-3"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-steel-100 text-steel-400">
                <FileText className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-steel-900">{m.name}</p>
                <p className="text-xs text-steel-500">Produit hors catalogue</p>
              </div>
              <input
                type="number"
                min={1}
                value={m.quantity}
                onChange={(e) =>
                  setManual((arr) =>
                    arr.map((x, i) =>
                      i === idx
                        ? { ...x, quantity: Math.max(1, parseInt(e.target.value || "1", 10)) }
                        : x,
                    ),
                  )
                }
                className="h-10 w-16 rounded-xl border border-steel-200 text-center text-sm font-semibold focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setManual((arr) => arr.filter((_, i) => i !== idx))}
                className="rounded-lg p-2 text-steel-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Retirer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add a product not in the catalogue */}
        <div className="mt-4 flex gap-2">
          <Input
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addManual();
              }
            }}
            placeholder="Ajouter un produit non listé (ex. Boulon M8 x 30)…"
          />
          <Button type="button" variant="outline" onClick={addManual}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>
      </div>

      {/* Contact form */}
      <div className="lg:col-span-2">
        <form
          onSubmit={submit}
          className="sticky top-24 space-y-4 rounded-2xl border border-steel-100 bg-white p-6 shadow-card"
        >
          <h2 className="font-display text-lg font-bold text-steel-900">
            Vos coordonnées
          </h2>
          <Field label="Nom complet" required>
            <Input
              required
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              placeholder="Votre nom"
            />
          </Field>
          <Field label="Entreprise">
            <Input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Société (facultatif)"
            />
          </Field>
          <Field label="Téléphone" required>
            <Input
              required
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+226 …"
            />
          </Field>
          <Field label="E-mail">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="vous@exemple.com"
            />
          </Field>
          <Field label="Message">
            <Textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Précisions, délai souhaité, lieu de livraison…"
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={submitting}>
            <FileText className="h-5 w-5" /> Envoyer ma demande de devis
          </Button>
          <p className="text-center text-xs text-steel-400">
            Réponse chiffrée sous 24h ouvrées. Aucun engagement.
          </p>
        </form>
      </div>
    </div>
  );
}
