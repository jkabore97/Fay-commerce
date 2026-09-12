import {
  Building2,
  Mountain,
  Wheat,
  Cog,
  Truck,
  Hammer,
  Bolt,
  Wrench,
  CircleDot,
  Disc3,
  Anchor,
  Nut,
  Package,
  type LucideIcon,
} from "lucide-react";

// Icons an admin can reference by name from the CMS (sectors), plus the
// per-category icons used on the storefront.
const REGISTRY: Record<string, LucideIcon> = {
  Building2,
  Mountain,
  Wheat,
  Cog,
  Truck,
  Hammer,
  Bolt,
  Wrench,
  CircleDot,
  Disc3,
  Anchor,
  Nut,
  Package,
};

export function DynamicIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = REGISTRY[name] ?? Package;
  return <Icon className={className} />;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  boulonnerie: Bolt,
  visserie: Wrench,
  ecrous: Nut,
  rondelles: CircleDot,
  "tiges-d-ancrage": Anchor,
  roulements: Disc3,
};

export function CategoryIcon({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[slug] ?? Package;
  return <Icon className={className} />;
}
