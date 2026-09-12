import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { FayMark } from "@/components/brand/logo";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Connexion — Espace personnel",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between steel-texture p-12 text-white lg:flex">
        <Logo variant="light" />
        <FayMark className="pointer-events-none absolute -bottom-16 -right-16 h-96 w-96 text-steel-800/50 animate-spin-slow" />
        <div className="relative max-w-md">
          <h1 className="font-display text-4xl font-extrabold leading-tight">
            Espace de gestion
          </h1>
          <p className="mt-4 text-lg text-steel-300">
            Stock, ventes, achats et comptabilité — le tableau de bord de Fay
            &amp; Partenaires.
          </p>
        </div>
        <p className="relative text-sm text-steel-500">
          © {new Date().getFullYear()} Fay &amp; Partenaires
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="font-display text-2xl font-bold text-steel-900">
            Connexion
          </h2>
          <p className="mt-1 text-sm text-steel-500">
            Réservé au personnel de Fay &amp; Partenaires.
          </p>
          <div className="mt-8">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-steel-500 hover:text-steel-800"
          >
            <ArrowLeft className="h-4 w-4" /> Retour au site
          </Link>
        </div>
      </div>
    </div>
  );
}
