import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  FileText,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Container, SectionHeading } from "@/components/ui/primitives";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { ProductGallery } from "@/components/site/product-gallery";
import { ProductCard } from "@/components/site/product-card";
import { AddToQuote } from "@/components/quote/add-to-quote";
import { getStorefrontProduct, getStorefrontProducts } from "@/lib/queries";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getStorefrontProduct(params.slug);
  if (!product) return { title: "Produit introuvable" };
  return {
    title: product.name,
    description:
      product.description ??
      `${product.name}${product.material ? ` — ${product.material}` : ""}. Disponible chez Fay & Partenaires. Devis gratuit.`,
  };
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getStorefrontProduct(params.slug);
  if (!product) notFound();

  const related = (
    await getStorefrontProducts({
      category: product.category_slug ?? undefined,
      limit: 5,
    })
  )
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const specs = Object.entries(product.specs || {});

  return (
    <>
      <Container className="py-8">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-1 text-sm text-steel-500">
          <Link href="/catalogue" className="hover:text-steel-800">Catalogue</Link>
          {product.category_slug && (
            <>
              <ChevronRight className="h-4 w-4" />
              <Link
                href={`/catalogue/${product.category_slug}`}
                className="hover:text-steel-800"
              >
                {product.category_name}
              </Link>
            </>
          )}
          <ChevronRight className="h-4 w-4" />
          <span className="text-steel-800">{product.name}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <ProductGallery
            image={product.image_url}
            gallery={product.gallery}
            alt={product.name}
            categorySlug={product.category_slug}
          />

          <div>
            <div className="flex flex-wrap items-center gap-2">
              {product.category_name && (
                <Link href={`/catalogue/${product.category_slug}`}>
                  <Badge tone="brass">{product.category_name}</Badge>
                </Link>
              )}
              {product.in_stock ? (
                <Badge tone="green">
                  <PackageCheck className="h-3.5 w-3.5" /> En stock
                </Badge>
              ) : (
                <Badge tone="neutral">Sur commande</Badge>
              )}
            </div>

            <h1 className="mt-4 font-display text-3xl font-bold text-steel-900 sm:text-4xl">
              {product.name}
            </h1>
            {product.sku && (
              <p className="mt-1 text-sm text-steel-400">Réf. {product.sku}</p>
            )}

            {product.description && (
              <p className="mt-4 leading-relaxed text-steel-600">
                {product.description}
              </p>
            )}

            {/* Price-free "buy" = add to quote */}
            <div className="mt-6 rounded-2xl border border-steel-100 bg-steel-50/60 p-5">
              <p className="text-sm font-semibold text-steel-700">
                Prix communiqué sur devis
              </p>
              <p className="mt-1 text-sm text-steel-500">
                Vente au lot / en gros. Indiquez la quantité souhaitée et
                ajoutez ce produit à votre demande de devis.
              </p>
              <div className="mt-4">
                <AddToQuote
                  withQuantity
                  size="lg"
                  item={{
                    product_id: product.id,
                    slug: product.slug,
                    name: product.name,
                    image_url: product.image_url,
                    unit: product.unit,
                  }}
                />
              </div>
              <div className="mt-3">
                <LinkButton href="/devis" variant="ghost" size="sm">
                  <FileText className="h-4 w-4" /> Voir ma demande de devis
                </LinkButton>
              </div>
            </div>

            {/* Specs */}
            {(specs.length > 0 || product.material || product.pack_size) && (
              <div className="mt-6 overflow-hidden rounded-2xl border border-steel-100">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-steel-100">
                    {product.material && (
                      <tr>
                        <td className="w-1/2 bg-steel-50/60 px-4 py-2.5 font-medium text-steel-600">
                          Matériau
                        </td>
                        <td className="px-4 py-2.5 text-steel-900">{product.material}</td>
                      </tr>
                    )}
                    {product.pack_size && (
                      <tr>
                        <td className="bg-steel-50/60 px-4 py-2.5 font-medium text-steel-600">
                          Conditionnement
                        </td>
                        <td className="px-4 py-2.5 text-steel-900">{product.pack_size}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="bg-steel-50/60 px-4 py-2.5 font-medium text-steel-600">
                        Unité de vente
                      </td>
                      <td className="px-4 py-2.5 text-steel-900 capitalize">{product.unit}</td>
                    </tr>
                    {specs.map(([k, v]) => (
                      <tr key={k}>
                        <td className="bg-steel-50/60 px-4 py-2.5 font-medium text-steel-600">
                          {k}
                        </td>
                        <td className="px-4 py-2.5 text-steel-900">{String(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Trust row */}
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-steel-500">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brass-500" /> Qualité garantie
              </span>
              <span className="inline-flex items-center gap-2">
                <Truck className="h-4 w-4 text-brass-500" /> Approvisionnement fiable
              </span>
              <span className="inline-flex items-center gap-2">
                <FileText className="h-4 w-4 text-brass-500" /> Devis sous 24h
              </span>
            </div>
          </div>
        </div>
      </Container>

      {related.length > 0 && (
        <section className="bg-white py-16">
          <Container>
            <SectionHeading eyebrow="À découvrir" title="Produits similaires" />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
