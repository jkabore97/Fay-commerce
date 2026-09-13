import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** URL-safe slug from an arbitrary string (handles accents). */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Public URL for a file stored in the Supabase media bucket, or the value
 *  itself if it is already an absolute URL. */
export function mediaUrl(
  pathOrUrl: string | null | undefined,
): string | null {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET ?? "media";
  if (!base) return null;
  return `${base}/storage/v1/object/public/${bucket}/${pathOrUrl.replace(/^\/+/, "")}`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "??";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Clamp helper used by charts and progress bars. */
export function clamp(n: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, n));
}
