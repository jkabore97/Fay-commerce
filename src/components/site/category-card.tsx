import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CategoryIcon } from "@/components/icons";
import { ProductImage } from "./product-image";
import { categoryImageFallback } from "@/lib/catalog-images";
import type { Category } from "@/lib/types";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/catalogue/${category.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-steel-100 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-cobalt-200 hover:shadow-card-hover"
    >
      <div className="relative border-b border-steel-100">
        <ProductImage
          src={category.image_url}
          fallbackSrc={categoryImageFallback(category.slug)}
          fit="contain"
          zoom
          alt={category.name}
          categorySlug={category.slug}
          rounded="rounded-none"
          className="aspect-[4/3] w-full"
        />
        <span className="absolute left-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-steel-900 text-white shadow-md transition-colors group-hover:bg-cobalt-500">
          <CategoryIcon slug={category.slug} className="h-5 w-5" />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-bold text-steel-900 transition-colors group-hover:text-cobalt-700">
            {category.name}
          </h3>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-steel-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cobalt-500" />
        </div>
        {category.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-steel-500">
            {category.description}
          </p>
        )}
      </div>
    </Link>
  );
}
