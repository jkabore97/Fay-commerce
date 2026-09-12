"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export function ContactForm() {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    company: "",
    phone: "",
    email: "",
    message: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.phone.trim() || !form.message.trim()) {
      toast("Nom, téléphone et message sont requis.", "error");
      return;
    }
    if (!isSupabaseConfigured()) {
      toast("Formulaire non connecté. Écrivez-nous par e-mail ou téléphone.", "error");
      return;
    }
    setSending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("submit_quote_request", {
        p_payload: {
          ...form,
          items: [{ name: "Renseignement général", quantity: 1 }],
        },
      });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Échec de l'envoi.", "error");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-600" />
        <h3 className="mt-4 font-display text-lg font-bold text-steel-900">
          Message envoyé
        </h3>
        <p className="mt-1 text-sm text-steel-600">
          Merci, nous vous recontactons rapidement.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-steel-100 bg-white p-6 shadow-card"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom complet" required>
          <Input
            required
            value={form.customer_name}
            onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
          />
        </Field>
        <Field label="Entreprise">
          <Input
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
        </Field>
        <Field label="Téléphone" required>
          <Input
            required
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>
        <Field label="E-mail">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Message" required>
        <Textarea
          required
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Comment pouvons-nous vous aider ?"
        />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={sending}>
        <Send className="h-4 w-4" /> Envoyer le message
      </Button>
    </form>
  );
}
