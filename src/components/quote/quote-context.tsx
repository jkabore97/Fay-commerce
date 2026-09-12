"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface QuoteItem {
  product_id: string | null;
  slug: string;
  name: string;
  image_url: string | null;
  unit: string | null;
  quantity: number;
}

interface QuoteContextValue {
  items: QuoteItem[];
  count: number;
  add: (item: Omit<QuoteItem, "quantity">, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  has: (slug: string) => boolean;
}

const QuoteContext = createContext<QuoteContextValue | null>(null);
const STORAGE_KEY = "fay-devis";

export function useQuote(): QuoteContextValue {
  const ctx = useContext(QuoteContext);
  if (!ctx) {
    return {
      items: [],
      count: 0,
      add: () => {},
      setQty: () => {},
      remove: () => {},
      clear: () => {},
      has: () => false,
    };
  }
  return ctx;
}

export function QuoteProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [ready, setReady] = useState(false);

  // Load once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  // Persist on change (after the initial load).
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, ready]);

  const add = useCallback(
    (item: Omit<QuoteItem, "quantity">, qty = 1) => {
      setItems((prev) => {
        const existing = prev.find((p) => p.slug === item.slug);
        if (existing) {
          return prev.map((p) =>
            p.slug === item.slug
              ? { ...p, quantity: p.quantity + qty }
              : p,
          );
        }
        return [...prev, { ...item, quantity: Math.max(1, qty) }];
      });
    },
    [],
  );

  const setQty = useCallback((slug: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((p) => p.slug !== slug)
        : prev.map((p) => (p.slug === slug ? { ...p, quantity: qty } : p)),
    );
  }, []);

  const remove = useCallback(
    (slug: string) => setItems((prev) => prev.filter((p) => p.slug !== slug)),
    [],
  );

  const clear = useCallback(() => setItems([]), []);
  const has = useCallback(
    (slug: string) => items.some((p) => p.slug === slug),
    [items],
  );

  const value = useMemo<QuoteContextValue>(
    () => ({
      items,
      count: items.reduce((n, p) => n + p.quantity, 0),
      add,
      setQty,
      remove,
      clear,
      has,
    }),
    [items, add, setQty, remove, clear, has],
  );

  return (
    <QuoteContext.Provider value={value}>{children}</QuoteContext.Provider>
  );
}
