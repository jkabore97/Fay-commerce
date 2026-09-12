"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

export function SearchBox({
  action = "/catalogue",
  defaultValue = "",
}: {
  action?: string;
  defaultValue?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    router.push(`${action}${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <form onSubmit={submit} className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-steel-400" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Rechercher un boulon, une vis, une référence…"
        className="h-12 w-full rounded-xl border border-steel-200 bg-white pl-12 pr-24 text-sm shadow-sm focus:border-brass-400 focus:outline-none focus:ring-2 focus:ring-brass-100"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute right-[86px] top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-700"
          aria-label="Effacer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <button
        type="submit"
        className="absolute right-1.5 top-1/2 h-9 -translate-y-1/2 rounded-lg bg-brass-500 px-4 text-sm font-semibold text-white hover:bg-brass-600"
      >
        Chercher
      </button>
    </form>
  );
}

export function CategoryChips({
  categories,
  active,
}: {
  categories: Category[];
  active?: string;
}) {
  return (
    <div className="thin-scroll flex gap-2 overflow-x-auto pb-1">
      <Link
        href="/catalogue"
        className={cn(
          "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
          !active
            ? "border-steel-900 bg-steel-900 text-white"
            : "border-steel-200 bg-white text-steel-700 hover:border-steel-300",
        )}
      >
        Tout
      </Link>
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/catalogue/${c.slug}`}
          className={cn(
            "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
            active === c.slug
              ? "border-steel-900 bg-steel-900 text-white"
              : "border-steel-200 bg-white text-steel-700 hover:border-steel-300",
          )}
        >
          {c.name}
        </Link>
      ))}
    </div>
  );
}
