"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  Boxes,
  ClipboardList,
  ExternalLink,
  FileText,
  Handshake,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Tag,
  Truck,
  Users,
  Warehouse,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/client";
import { cn, initials } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/auth";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}
interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    title: "Général",
    items: [{ href: "/admin", label: "Tableau de bord", icon: LayoutDashboard }],
  },
  {
    title: "Catalogue & stock",
    items: [
      { href: "/admin/produits", label: "Produits", icon: Boxes },
      { href: "/admin/categories", label: "Catégories", icon: Tag },
      { href: "/admin/stock", label: "Stock & mouvements", icon: Warehouse },
    ],
  },
  {
    title: "Commerce",
    items: [
      { href: "/admin/ventes", label: "Ventes", icon: Receipt },
      { href: "/admin/devis", label: "Demandes de devis", icon: ClipboardList },
      { href: "/admin/achats", label: "Achats", icon: Truck, adminOnly: true },
      {
        href: "/admin/comptabilite",
        label: "Comptabilité",
        icon: BookOpen,
        adminOnly: true,
      },
    ],
  },
  {
    title: "Site web",
    items: [
      { href: "/admin/contenu", label: "Contenu", icon: FileText, adminOnly: true },
      { href: "/admin/bannieres", label: "Bannières & promos", icon: ImageIcon, adminOnly: true },
      { href: "/admin/partenaires", label: "Partenaires", icon: Handshake, adminOnly: true },
    ],
  },
  {
    title: "Administration",
    items: [{ href: "/admin/equipe", label: "Équipe", icon: Users, adminOnly: true }],
  },
];

export function AdminShell({
  fullName,
  role,
  children,
}: {
  fullName: string;
  role: Role;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const signOut = async () => {
    try {
      await createClient().auth.signOut();
    } catch {
      /* ignore */
    }
    router.push("/login");
    router.refresh();
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-steel-800 px-5">
        <Logo variant="light" href="/admin" />
      </div>
      <nav className="thin-scroll flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV.map((section) => {
          const items = section.items.filter(
            (i) => !i.adminOnly || role === "admin",
          );
          if (!items.length) return null;
          return (
            <div key={section.title}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-steel-500">
                {section.title}
              </p>
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-brass-500 text-white shadow-sm"
                          : "text-steel-300 hover:bg-steel-800 hover:text-white",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-steel-800 p-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-steel-300 hover:bg-steel-800 hover:text-white"
        >
          <ExternalLink className="h-[18px] w-[18px]" /> Voir le site
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-steel-50/60">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 steel-texture lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-steel-950/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 steel-texture">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 text-steel-400 hover:text-white"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-steel-100 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            className="rounded-lg p-2 text-steel-600 hover:bg-steel-100 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center justify-end gap-3">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold leading-tight text-steel-900">
                  {fullName}
                </p>
                <p className="text-xs text-steel-500">{ROLE_LABELS[role]}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-steel-900 text-sm font-bold text-brass-400">
                {initials(fullName)}
              </div>
            </div>
            <button
              onClick={signOut}
              className="rounded-lg p-2 text-steel-500 hover:bg-red-50 hover:text-red-600"
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
