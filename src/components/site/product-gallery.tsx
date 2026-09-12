"use client";

import { useState } from "react";
import { ProductImage } from "./product-image";
import { cn } from "@/lib/utils";

export function ProductGallery({
  image,
  gallery,
  alt,
  categorySlug,
}: {
  image: string | null;
  gallery: string[];
  alt: string;
  categorySlug?: string | null;
}) {
  const all = [image, ...(gallery || [])].filter(Boolean) as string[];
  const [active, setActive] = useState(all[0] ?? null);

  return (
    <div>
      <ProductImage
        src={active}
        alt={alt}
        categorySlug={categorySlug}
        className="aspect-square w-full"
      />
      {all.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {all.map((src) => (
            <button
              key={src}
              onClick={() => setActive(src)}
              className={cn(
                "overflow-hidden rounded-xl border-2 transition-colors",
                active === src ? "border-brass-500" : "border-transparent",
              )}
              aria-label="Voir l'image"
            >
              <ProductImage
                src={src}
                alt=""
                categorySlug={categorySlug}
                className="aspect-square w-full"
                rounded="rounded-lg"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
