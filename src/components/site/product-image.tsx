import { FayMark } from "@/components/brand/logo";
import { CategoryIcon } from "@/components/icons";
import { mediaUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Product / category image with a branded fallback. Fasteners are hard to
 * photograph well and many rows will have no image at first, so the fallback is
 * designed to look intentional: a steel field with the category icon and the
 * Fay mark, not a broken-image glyph.
 */
export function ProductImage({
  src,
  alt,
  categorySlug,
  className,
  rounded = "rounded-2xl",
}: {
  src: string | null | undefined;
  alt: string;
  categorySlug?: string | null;
  className?: string;
  rounded?: string;
}) {
  const url = mediaUrl(src);
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-steel-100",
        rounded,
        className,
      )}
    >
      {url ? (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="relative flex h-full w-full items-center justify-center steel-texture">
          {categorySlug ? (
            <CategoryIcon
              slug={categorySlug}
              className="h-1/3 w-1/3 max-h-16 max-w-16 text-steel-600"
            />
          ) : (
            <FayMark className="h-1/3 w-1/3 max-h-16 max-w-16 text-brass-600/70" />
          )}
          <FayMark className="absolute bottom-2 right-2 h-5 w-5 text-steel-700" />
        </div>
      )}
    </div>
  );
}
