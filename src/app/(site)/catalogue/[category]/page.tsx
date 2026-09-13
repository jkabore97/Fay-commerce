import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogueView } from "@/components/site/catalogue-view";
import { getStorefrontCategories, getStorefrontProducts } from "@/lib/queries";

export async function generateMetadata({
  params,
}: {
  params: { category: string };
}): Promise<Metadata> {
  const categories = await getStorefrontCategories();
  const cat = categories.find((c) => c.slug === params.category);
  if (!cat) return { title: "Catégorie introuvable" };
  return {
    title: `${cat.name} — Catalogue`,
    description:
      cat.description ??
      `Découvrez notre gamme de ${cat.name.toLowerCase()}. Devis gratuit sur demande.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { category: string };
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim() || undefined;
  const categories = await getStorefrontCategories();
  const cat = categories.find((c) => c.slug === params.category);
  if (!cat) notFound();

  const products = await getStorefrontProducts({
    category: cat.slug,
    search: q,
    limit: 120,
  });

  return (
    <CatalogueView
      title={cat.name}
      description={cat.description ?? undefined}
      categories={categories}
      products={products}
      activeCategory={cat.slug}
      query={q}
    />
  );
}
