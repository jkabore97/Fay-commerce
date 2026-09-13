import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CategoryIcon } from "@/components/icons";
import { mediaUrl } from "@/lib/utils";
import type { Category } from "@/lib/types";

export function CategoryCard({ category }: { category: Category }) {
  const img = mediaUrl(category.image_url);
  return (
    <Link
      href={`/catalogue/${category.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-steel-100 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brass-200 hover:shadow-card-hover"
    >
      {img && (
        <img
          src={img}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-10"
        />
      )}
      <div className="relative flex items-center justify-between">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-steel-900 text-brass-500 transition-colors group-hover:bg-brass-500 group-hover:text-white">
          <CategoryIcon slug={category.slug} className="h-7 w-7" />
        </div>
        <ArrowUpRight className="h-5 w-5 text-steel-300 transition-all group-hover:text-brass-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
      <h3 className="relative mt-5 font-display text-lg font-bold text-steel-900">
        {category.name}
      </h3>
      {category.description && (
        <p className="relative mt-1.5 line-clamp-2 text-sm text-steel-500">
          {category.description}
        </p>
      )}
    </Link>
  );
}
