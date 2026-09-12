import { cn } from "@/lib/utils";

export function Table({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="thin-scroll w-full overflow-x-auto rounded-2xl border border-steel-100 bg-white shadow-card">
      <table className={cn("w-full min-w-full border-collapse text-sm", className)}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-steel-100 bg-steel-50/70 text-left">
      {children}
    </thead>
  );
}

export function TH({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-steel-500",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-steel-100">{children}</tbody>;
}

export function TR({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <tr className={cn("transition-colors hover:bg-steel-50/60", className)}>
      {children}
    </tr>
  );
}

export function TD({
  className,
  children,
  colSpan,
}: {
  className?: string;
  children?: React.ReactNode;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cn("px-4 py-3 text-steel-700", className)}>
      {children}
    </td>
  );
}
