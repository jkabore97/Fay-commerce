import Link from "next/link";
import { cn } from "@/lib/utils";

/** The Fay mark: a hex nut with a bolt-slot, drawn in brass. */
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

export function Logo({
  variant = "dark",
  className,
  href = "/",
  showText = true,
}: {
  variant?: "dark" | "light";
  className?: string;
  href?: string | null;
  showText?: boolean;
}) {
  const textColor = variant === "light" ? "text-white" : "text-steel-900";
  const subColor = variant === "light" ? "text-steel-200" : "text-steel-500";

  const inner = (
    <span className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="relative inline-flex h-9 w-9 items-center justify-center">
        <FayMark className="h-9 w-9 text-brass-500 transition-transform duration-500 group-hover:rotate-90" />
      </span>
      {showText && (
        <span className="flex flex-col leading-none">
          <span className={cn("font-display text-lg font-extrabold tracking-tight", textColor)}>
            FAY<span className="text-brass-500"> &amp; </span>Partenaires
          </span>
          <span className={cn("text-[10px] font-semibold uppercase tracking-[0.18em]", subColor)}>
            Boulonnerie · depuis 1998
          </span>
        </span>
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
