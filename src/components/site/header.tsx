"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Menu, Phone, ShoppingCart, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";
import { useQuote } from "@/components/quote/quote-context";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/a-propos", label: "À propos" },
  { href: "/contact", label: "Contact" },
];

export function Header({ phone }: { phone?: string }) {
  const pathname = usePathname();
  const { count } = useQuote();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-steel-100 bg-white/85 backdrop-blur-md">
      {/* Top utility strip */}
      <div className="hidden bg-steel-900 text-steel-200 md:block">
        <div className="container-fay flex h-9 items-center justify-between text-xs">
          <span className="font-medium tracking-wide">
            Spécialiste en boulonnerie · Ouagadougou, Burkina Faso
          </span>
          {phone && (
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1.5 font-semibold text-white hover:text-cobalt-400"
            >
              <Phone className="h-3.5 w-3.5" /> {phone}
            </a>
          )}
        </div>
      </div>

      <div className="container-fay flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "link-underline text-sm font-semibold transition-colors",
                isActive(item.href)
                  ? "text-cobalt-600"
                  : "text-steel-700 hover:text-steel-900",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/devis"
            className="relative inline-flex h-11 items-center gap-2 rounded-xl border border-steel-200 bg-white px-3.5 text-sm font-semibold text-steel-800 transition-colors hover:border-steel-300 hover:bg-steel-50"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Ma demande</span>
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-cobalt-500 px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          <LinkButton href="/devis" className="hidden lg:inline-flex">
            <FileText className="h-4 w-4" /> Demander un devis
          </LinkButton>
          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-steel-200 text-steel-700 md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-steel-100 bg-white md:hidden"
          >
            <div className="container-fay flex flex-col gap-1 py-3">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm font-semibold",
                    isActive(item.href)
                      ? "bg-cobalt-50 text-cobalt-700"
                      : "text-steel-700 hover:bg-steel-50",
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <LinkButton href="/devis" className="mt-2" onClick={() => setOpen(false)}>
                <FileText className="h-4 w-4" /> Demander un devis
              </LinkButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
