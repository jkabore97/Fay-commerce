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
