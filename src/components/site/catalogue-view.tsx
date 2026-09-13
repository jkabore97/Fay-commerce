import { PackageSearch } from "lucide-react";
import { Container } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { SearchBox, CategoryChips } from "./catalogue-controls";
import { ProductCard } from "./product-card";
import type { Category, StorefrontProduct } from "@/lib/types";

export function CatalogueView({
  title,
  description,
  categories,
  products,
  activeCategory,
  query,
}: {
  title: string;
  description?: string;
  categories: Category[];
  products: StorefrontProduct[];
  activeCategory?: string;
  query?: string;
}) {
  return (
    <>
      <section className="border-b border-steel-100 bg-white">
        <Container className="py-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-cobalt-600">
            Catalogue
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-bold text-steel-900 sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-steel-500">{description}</p>
          )}
          <div className="mt-6">
            <SearchBox
              action={activeCategory ? `/catalogue/${activeCategory}` : "/catalogue"}
              defaultValue={query ?? ""}
            />
          </div>
        </Container>
      </section>

      <section className="py-8">
        <Container>
          <CategoryChips categories={categories} active={activeCategory} />

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-steel-500">
              {products.length} produit{products.length > 1 ? "s" : ""}
              {query ? ` pour « ${query} »` : ""}
            </p>
          </div>

          {products.length > 0 ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <EmptyState
              className="mt-8"
              icon={<PackageSearch className="h-7 w-7" />}
              title="Aucun produit trouvé"
              description={
                query
                  ? "Aucun article ne correspond à votre recherche. Demandez-nous directement — nous avons peut-être ce produit en stock."
                  : "Cette catégorie ne contient pas encore de produit publié. Contactez-nous pour toute demande."
              }
              action={
                <LinkButton href="/devis" variant="primary">
                  Demander un devis
                </LinkButton>
              }
            />
          )}
        </Container>
      </section>
    </>
  );
}
