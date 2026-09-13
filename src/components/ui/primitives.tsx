import { cn } from "@/lib/utils";

export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("container-fay", className)}>{children}</div>;
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("card", className)}>{children}</div>;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-steel-200 bg-white/60 px-6 py-14 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-steel-100 text-steel-500">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-steel-900">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-steel-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  icon,
  tone = "steel",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "steel" | "brass" | "green" | "red";
  className?: string;
}) {
  const tones = {
    steel: "text-steel-500 bg-steel-100",
    brass: "text-brass-700 bg-brass-100",
    green: "text-emerald-700 bg-emerald-100",
    red: "text-red-600 bg-red-100",
  };
  return (
    <div className={cn("card p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-steel-500">{label}</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-steel-900">
            {value}
          </p>
          {sub && <div className="mt-1 text-xs text-steel-500">{sub}</div>}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              tones[tone],
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-steel-100 pb-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        <h1 className="font-display text-2xl font-bold text-steel-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-steel-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  center,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  center?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(center && "mx-auto text-center", "max-w-2xl", className)}>
      {eyebrow && (
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-brass-600">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-3xl font-bold text-steel-900 sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-base leading-relaxed text-steel-600">
          {description}
        </p>
      )}
    </div>
  );
}
