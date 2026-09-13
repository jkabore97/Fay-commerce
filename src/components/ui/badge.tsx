import { cn } from "@/lib/utils";

type Tone =
  | "neutral"
  | "cobalt"
  | "steel"
  | "green"
  | "red"
  | "amber"
  | "blue";

const tones: Record<Tone, string> = {
  neutral: "bg-steel-100 text-steel-700",
  cobalt: "bg-cobalt-100 text-cobalt-800",
  steel: "bg-steel-900 text-white",
  green: "bg-emerald-100 text-emerald-800",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-800",
  blue: "bg-sky-100 text-sky-800",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
