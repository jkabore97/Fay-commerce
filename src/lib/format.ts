// Formatting helpers. Currency is XOF (Franc CFA), the currency of Burkina Faso.
// Locale is French. All money in the DB is stored as a plain number of francs.

const XOF = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });

export function formatMoney(value: number | null | undefined): string {
  return XOF.format(Number(value ?? 0));
}

export function formatNumber(value: number | null | undefined): string {
  return NUM.format(Number(value ?? 0));
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Human relative-ish label for a date (aujourd'hui / hier / la date). */
export function formatDay(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  const today = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(d, today)) return "Aujourd'hui";
  if (isSameDay(d, yesterday)) return "Hier";
  return formatDate(d);
}
