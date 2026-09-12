import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  CONTENT_KEYS,
  DEFAULT_CATEGORIES,
  DEFAULT_CONTENT,
  withDefaults,
  type SiteContent,
} from "@/lib/content";
import type {
  Banner,
  Category,
  Partner,
  StorefrontProduct,
} from "@/lib/types";

// ── Editable site content ───────────────────────────────────────────────────

export async function getSiteContent(): Promise<SiteContent> {
  if (!isSupabaseConfigured()) return DEFAULT_CONTENT;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("site_content")
      .select("key, value");
    if (error || !data) return DEFAULT_CONTENT;

    const stored = new Map(data.map((r) => [r.key as string, r.value]));
    const out = {} as SiteContent;
    for (const key of CONTENT_KEYS) {
      // @ts-expect-error indexed assignment across the union is safe here
      out[key] = withDefaults(key, stored.get(key));
    }
    return out;
  } catch {
    return DEFAULT_CONTENT;
  }
}

// ── Promotional banners & partner logos (public, active rows only) ───────────

export async function getBanners(
  kind?: "promo" | "hero_slide",
): Promise<Banner[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    let q = supabase
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (kind) q = q.eq("kind", kind);
    const { data } = await q;
    return (data as Banner[] | null) ?? [];
  } catch {
    return [];
  }
}

export async function getPartners(): Promise<Partner[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("partners")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    return (data as Partner[] | null) ?? [];
  } catch {
    return [];
  }
}

// ── Storefront catalogue (price-free, via SECURITY DEFINER RPCs) ─────────────

/** Fallback category list so the catalogue is never empty on a fresh install. */
function fallbackCategories(): Category[] {
  return DEFAULT_CATEGORIES.map((c, i) => ({
    id: c.slug,
    slug: c.slug,
    name: c.name,
    description: c.description,
    image_url: null,
    sort_order: i,
    is_active: true,
    created_at: new Date(0).toISOString(),
  }));
}

export async function getStorefrontCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) return fallbackCategories();
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("storefront_categories");
    if (error || !data || data.length === 0) return fallbackCategories();
    return data as Category[];
  } catch {
    return fallbackCategories();
  }
}

export interface StorefrontQuery {
  category?: string;
  search?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}

export async function getStorefrontProducts(
  opts: StorefrontQuery = {},
): Promise<StorefrontProduct[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("storefront_products", {
      p_category: opts.category ?? null,
      p_search: opts.search ?? null,
      p_featured: opts.featured ?? null,
      p_limit: opts.limit ?? 60,
      p_offset: opts.offset ?? 0,
    });
    if (error || !data) return [];
    return data as StorefrontProduct[];
  } catch {
    return [];
  }
}

export async function getStorefrontProduct(
  slug: string,
): Promise<StorefrontProduct | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("storefront_product", {
      p_slug: slug,
    });
    if (error || !data || data.length === 0) return null;
    return (Array.isArray(data) ? data[0] : data) as StorefrontProduct;
  } catch {
    return null;
  }
}
