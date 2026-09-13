import Link from "next/link";
import { cn } from "@/lib/utils";
import { SITE_IMAGES } from "@/lib/catalog-images";

/** Decorative hex-nut mark (used for spinners, watermarks, placeholders). */
export function FayMark({
  className,
  spinning = false,
}: {
  className?: string;
  spinning?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(spinning && "animate-spin-slow", className)}
      role="img"
      aria-label="Fay & Partenaires"
    >
      <polygon
        points="12,1.6 21,6.8 21,17.2 12,22.4 3,17.2 3,6.8"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="5.4" fill="#12233a" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
    </svg>
  );
}

/**
 * The brand lockup — the actual Fay & Partenaires logo from the brochure.
 * On a dark surface (`variant="light"`) it sits inside a white chip, echoing
 * the framed "stamp" treatment on the brochure cover.
 */
export function Logo({
  variant = "dark",
  className,
  href = "/",
}: {
  variant?: "dark" | "light";
  className?: string;
  href?: string | null;
  /** Deprecated: the logo image already contains the wordmark. */
  showText?: boolean;
}) {
  const chip = variant === "light";
  const img = (
    <img
      src={SITE_IMAGES.logo}
      alt="Fay & Partenaires"
      className="h-9 w-auto sm:h-10"
    />
  );
  const inner = (
    <span className={cn("inline-flex items-center", className)}>
      {chip ? (
        <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1.5 shadow-sm">
          {img}
        </span>
      ) : (
        img
      )}
    </span>
  );

  if (href === null) return inner;
  return (
    <Link href={href} aria-label="Accueil — Fay & Partenaires">
      {inner}
    </Link>
  );
}
