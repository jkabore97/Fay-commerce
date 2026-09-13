import { FayMark } from "@/components/brand/logo";
import { CategoryIcon } from "@/components/icons";
import { mediaUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Product / category image. Resolution order:
 *   1. `src`         — a DB image_url (Supabase Storage path or absolute URL)
 *   2. `fallbackSrc` — a built-in brochure photo under /public (root-relative)
 *   3. a branded steel placeholder with the category icon
 */
export function ProductImage({
  src,
  fallbackSrc,
  alt,
  categorySlug,
  className,
  rounded = "rounded-2xl",
  fit = "cover",
}: {
  src: string | null | undefined;
  fallbackSrc?: string | null;
  alt: string;
  categorySlug?: string | null;
  className?: string;
  rounded?: string;
  fit?: "cover" | "contain";
}) {
  const url = mediaUrl(src) ?? fallbackSrc ?? null;
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-white",
        rounded,
        className,
      )}
    >
      {url ? (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          className={cn(
            "h-full w-full",
            fit === "contain" ? "object-contain p-3" : "object-cover",
          )}
        />
      ) : (
        <div className="relative flex h-full w-full items-center justify-center steel-texture">
          {categorySlug ? (
            <CategoryIcon
              slug={categorySlug}
              className="h-1/3 w-1/3 max-h-16 max-w-16 text-steel-600"
            />
          ) : (
            <FayMark className="h-1/3 w-1/3 max-h-16 max-w-16 text-cobalt-600/70" />
          )}
          <FayMark className="absolute bottom-2 right-2 h-5 w-5 text-steel-700" />
        </div>
      )}
    </div>
  );
}
