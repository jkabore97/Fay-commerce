import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "./product-image";
import { AddToQuote } from "@/components/quote/add-to-quote";
import { productImageFallback } from "@/lib/catalog-images";
import type { StorefrontProduct } from "@/lib/types";

export function ProductCard({ product }: { product: StorefrontProduct }) {
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-steel-100 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
      <Link href={`/produit/${product.slug}`} className="relative block">
        <ProductImage
          src={product.image_url}
          fallbackSrc={productImageFallback(product.slug, product.category_slug)}
          fit="contain"
          alt={product.name}
          categorySlug={product.category_slug}
          rounded="rounded-none"
          className="aspect-[4/3] w-full border-b border-steel-100"
        />
        <div className="absolute left-3 top-3 flex gap-1.5">
          {product.is_featured && <Badge tone="cobalt">Populaire</Badge>}
        </div>
        <div className="absolute right-3 top-3">
          {product.in_stock ? (
            <Badge tone="green">En stock</Badge>
          ) : (
            <Badge tone="neutral">Sur commande</Badge>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {product.category_name && (
          <p className="text-xs font-semibold uppercase tracking-wide text-cobalt-600">
            {product.category_name}
          </p>
        )}
        <Link href={`/produit/${product.slug}`}>
          <h3 className="mt-1 line-clamp-2 font-display text-base font-bold text-steel-900 transition-colors group-hover:text-cobalt-700">
            {product.name}
          </h3>
        </Link>
        {product.material && (
          <p className="mt-1 line-clamp-1 text-sm text-steel-500">
            {product.material}
          </p>
        )}
        {product.pack_size && (
          <p className="mt-2 text-xs font-medium text-steel-600">
            Conditionnement : {product.pack_size}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2 pt-2">
          <AddToQuote
            item={{
              product_id: product.id,
              slug: product.slug,
              name: product.name,
              image_url: product.image_url,
              unit: product.unit,
            }}
            size="sm"
            className="flex-1"
          />
          <Link
            href={`/produit/${product.slug}`}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-steel-200 text-steel-600 transition-colors hover:border-steel-300 hover:text-steel-900"
            aria-label={`Voir ${product.name}`}
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
