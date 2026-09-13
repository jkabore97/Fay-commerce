// Built-in photos extracted from the Fay & Partenaires brochure, served from
// /public. These are used as FALLBACKS: whenever a category or product has no
// image_url in the database, the storefront shows the matching brochure photo.
// An image an admin uploads later always takes precedence over these.

export const SITE_IMAGES = {
  logo: "/brand/logo.jpg",
  hero: "/catalog/hero.jpg",
  about: "/catalog/about.jpg",
} as const;

export const CATEGORY_IMAGES: Record<string, string> = {
  boulonnerie: "/catalog/cat-boulonnerie.jpg",
  visserie: "/catalog/cat-visserie.jpg",
  ecrous: "/catalog/cat-ecrous.jpg",
  rondelles: "/catalog/cat-rondelles.jpg",
  "tiges-d-ancrage": "/catalog/cat-tiges-d-ancrage.jpg",
  roulements: "/catalog/cat-roulements.jpg",
};

export const PRODUCT_IMAGES: Record<string, string> = {
  "boulon-hm-10x40": "/catalog/prod-boulon-hm-10x40.jpg",
  "boulon-hm-12x60": "/catalog/prod-boulon-hm-12x60.jpg",
  "vis-tole-4-8x19": "/catalog/prod-vis-tole-4-8x19.jpg",
  "vis-bois-5x50": "/catalog/prod-vis-bois-5x50.jpg",
  "ecrou-hexagonal-m10": "/catalog/prod-ecrou-hexagonal-m10.jpg",
  "ecrou-frein-m12": "/catalog/prod-ecrou-frein-m12.jpg",
  "rondelle-plate-m10": "/catalog/prod-rondelle-plate-m10.jpg",
  "rondelle-grower-m10": "/catalog/prod-rondelle-grower-m10.jpg",
  "tige-filetee-m12-1m": "/catalog/prod-tige-filetee-m12-1m.jpg",
  "tige-ancrage-m16": "/catalog/prod-tige-ancrage-m16.jpg",
  "roulement-6204-2rs": "/catalog/prod-roulement-6204-2rs.jpg",
  "roulement-6205-2rs": "/catalog/prod-roulement-6205-2rs.jpg",
};

/** Best fallback photo for a product: its own, else its category's. */
export function productImageFallback(
  slug: string | null | undefined,
  categorySlug: string | null | undefined,
): string | undefined {
  if (slug && PRODUCT_IMAGES[slug]) return PRODUCT_IMAGES[slug];
  if (categorySlug && CATEGORY_IMAGES[categorySlug]) {
    return CATEGORY_IMAGES[categorySlug];
  }
  return undefined;
}

export function categoryImageFallback(
  slug: string | null | undefined,
): string | undefined {
  return slug ? CATEGORY_IMAGES[slug] : undefined;
}

// ── Extra brochure photography, grouped by family ───────────────────────────
// Used for the animated home marquee and for multi-image product galleries.
export const GALLERY_BY_CATEGORY: Record<string, string[]> = {
  boulonnerie: [
    "/catalog/gallery/boulonnerie/g01.jpg",
    "/catalog/gallery/boulonnerie/g02.jpg",
    "/catalog/gallery/boulonnerie/g03.jpg",
    "/catalog/gallery/boulonnerie/g04.jpg",
    "/catalog/gallery/boulonnerie/g05.jpg",
    "/catalog/gallery/boulonnerie/g06.jpg",
    "/catalog/gallery/boulonnerie/g07.jpg",
    "/catalog/gallery/boulonnerie/g08.jpg",
    "/catalog/gallery/boulonnerie/g09.jpg",
    "/catalog/gallery/boulonnerie/g10.jpg",
    "/catalog/gallery/boulonnerie/g11.jpg",
    "/catalog/gallery/boulonnerie/g12.jpg",
  ],
  visserie: [
    "/catalog/gallery/visserie/g01.jpg",
    "/catalog/gallery/visserie/g02.jpg",
    "/catalog/gallery/visserie/g03.jpg",
    "/catalog/gallery/visserie/g04.jpg",
    "/catalog/gallery/visserie/g05.jpg",
    "/catalog/gallery/visserie/g06.jpg",
  ],
  ecrous: [
    "/catalog/gallery/ecrous/g01.jpg",
    "/catalog/gallery/ecrous/g02.jpg",
    "/catalog/gallery/ecrous/g03.jpg",
    "/catalog/gallery/ecrous/g04.jpg",
    "/catalog/gallery/ecrous/g05.jpg",
    "/catalog/gallery/ecrous/g06.jpg",
    "/catalog/gallery/ecrous/g07.jpg",
    "/catalog/gallery/ecrous/g08.jpg",
    "/catalog/gallery/ecrous/g09.jpg",
    "/catalog/gallery/ecrous/g10.jpg",
    "/catalog/gallery/ecrous/g11.jpg",
    "/catalog/gallery/ecrous/g12.jpg",
  ],
  rondelles: [
    "/catalog/gallery/rondelles/g01.jpg",
    "/catalog/gallery/rondelles/g02.jpg",
    "/catalog/gallery/rondelles/g03.jpg",
    "/catalog/gallery/rondelles/g04.jpg",
    "/catalog/gallery/rondelles/g05.jpg",
  ],
  roulements: [
    "/catalog/gallery/roulements/g01.jpg",
    "/catalog/gallery/roulements/g02.jpg",
    "/catalog/gallery/roulements/g03.jpg",
    "/catalog/gallery/roulements/g04.jpg",
  ],
};
// Anchor rods share the p06 family (washers / anchors).
GALLERY_BY_CATEGORY["tiges-d-ancrage"] = GALLERY_BY_CATEGORY.rondelles;

function interleave(lists: string[][]): string[] {
  const out: string[] = [];
  let i = 0;
  let added = true;
  while (added) {
    added = false;
    for (const l of lists) {
      if (l[i]) {
        out.push(l[i]);
        added = true;
      }
    }
    i++;
  }
  return out;
}

/** A varied, deterministic ordering of every gallery photo (for the marquee). */
export const GALLERY_ALL: string[] = interleave([
  GALLERY_BY_CATEGORY.boulonnerie,
  GALLERY_BY_CATEGORY.ecrous,
  GALLERY_BY_CATEGORY.visserie,
  GALLERY_BY_CATEGORY.rondelles,
  GALLERY_BY_CATEGORY.roulements,
]);

/** Several photos for one product page: its own, then a few from its family. */
export function productGalleryFallback(
  slug: string | null | undefined,
  categorySlug: string | null | undefined,
): string[] {
  const out: string[] = [];
  const primary = productImageFallback(slug, categorySlug);
  if (primary) out.push(primary);
  const family = categorySlug ? GALLERY_BY_CATEGORY[categorySlug] ?? [] : [];
  for (const g of family) {
    if (!out.includes(g)) out.push(g);
    if (out.length >= 5) break;
  }
  return out;
}

