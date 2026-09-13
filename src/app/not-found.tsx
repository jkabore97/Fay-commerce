import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo href="/" />
      <p className="mt-10 font-display text-7xl font-extrabold text-brass-500">
        404
      </p>
      <h1 className="mt-4 font-display text-2xl font-bold text-steel-900">
        Page introuvable
      </h1>
      <p className="mt-2 max-w-sm text-steel-500">
        La page que vous cherchez n'existe pas ou a été déplacée.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-xl bg-brass-500 px-5 text-sm font-semibold text-white hover:bg-brass-600"
        >
          Retour à l'accueil
        </Link>
        <Link
          href="/catalogue"
          className="inline-flex h-11 items-center rounded-xl border border-steel-200 bg-white px-5 text-sm font-semibold text-steel-800 hover:bg-steel-50"
        >
          Voir le catalogue
        </Link>
      </div>
    </div>
  );
}
