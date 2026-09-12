import type { Metadata } from "next";
import { CatalogueView } from "@/components/site/catalogue-view";
import { getStorefrontCategories, getStorefrontProducts } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Catalogue — boulonnerie, visserie & fixations",
  description:
    "Parcourez notre catalogue de fixations : boulons, vis, écrous, rondelles, tiges d'ancrage et roulements. Demandez un devis gratuit.",
};

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim() || undefined;
  const [categories, products] = await Promise.all([
    getStorefrontCategories(),
    getStorefrontProducts({ search: q, limit: 120 }),
  ]);

  return (
    <CatalogueView
      title="Tout le catalogue"
      description="Une gamme complète de fixations pour l'industrie, le BTP et les mines. Les prix sont communiqués sur devis."
      categories={categories}
      products={products}
      query={q}
    />
  );
}
