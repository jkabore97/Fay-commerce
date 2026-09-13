"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Info, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured()) {
      setError(
        "L'authentification n'est pas configurée. Renseignez les variables Supabase dans .env.local.",
      );
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        // The message depends on WHY sign-in failed, so a configuration problem
        // (app pointing at the wrong Supabase project, or a URL/key mismatch)
        // is never mistaken for a wrong password. The raw error is logged so it
        // shows up in the browser console for support.
        console.error("[login] signInWithPassword failed:", error);
        const code = (error as { code?: string }).code;
        const status = (error as { status?: number }).status;
        if (code === "invalid_credentials" || status === 400) {
          setError(
            "Identifiants incorrects. Vérifiez votre e-mail et mot de passe.",
          );
        } else if (code === "email_not_confirmed") {
          setError(
            "Cet e-mail n'est pas encore confirmé. Contactez un administrateur.",
          );
        } else if (status === 401 || status === 403) {
          setError(
            "Clé d'API Supabase invalide. Vérifiez NEXT_PUBLIC_SUPABASE_ANON_KEY (elle doit provenir du même projet que l'URL).",
          );
        } else {
          setError(
            "Impossible de contacter le serveur d'authentification. Vérifiez la configuration Supabase (URL et clé) puis réessayez.",
          );
        }
        return;
      }
      const redirect = params.get("redirect") || "/admin";
      router.push(redirect);
      router.refresh();
    } catch (err) {
      // A thrown (rather than returned) error is almost always a network or URL
      // problem: an unreachable or malformed NEXT_PUBLIC_SUPABASE_URL.
      console.error("[login] unexpected error:", err);
      setError(
        "Impossible de contacter le serveur d'authentification. Vérifiez la configuration Supabase (URL et clé) puis réessayez.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {params.get("denied") && !error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Ce compte est bien connecté mais n&apos;a pas encore d&apos;accès au
            back-office. Un administrateur doit l&apos;ajouter à l&apos;équipe
            (voir le README pour créer le premier administrateur).
          </span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <Field label="Adresse e-mail" required>
        <Input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@fayetpartenaires.com"
        />
      </Field>
      <Field label="Mot de passe" required>
        <Input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        <LogIn className="h-4 w-4" /> Se connecter
      </Button>
    </form>
  );
}
