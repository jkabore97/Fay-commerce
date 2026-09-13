import type {
  AccountType,
  QuoteStatus,
  Role,
  StockMovementKind,
} from "@/lib/types";

type Tone = "neutral" | "brass" | "steel" | "green" | "red" | "amber" | "blue";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrateur",
  employee: "Employé",
};

export const QUOTE_STATUS: Record<QuoteStatus, { label: string; tone: Tone }> = {
  new: { label: "Nouveau", tone: "blue" },
  in_review: { label: "En traitement", tone: "amber" },
  quoted: { label: "Devis envoyé", tone: "brass" },
  won: { label: "Gagné", tone: "green" },
  lost: { label: "Perdu", tone: "red" },
  cancelled: { label: "Annulé", tone: "neutral" },
};

export const QUOTE_STATUS_ORDER: QuoteStatus[] = [
  "new",
  "in_review",
  "quoted",
  "won",
  "lost",
  "cancelled",
];

export const STOCK_KIND: Record<StockMovementKind, { label: string; tone: Tone }> = {
  receipt: { label: "Réception", tone: "green" },
  adjustment: { label: "Correction", tone: "amber" },
  sale: { label: "Vente", tone: "steel" },
  return: { label: "Retour", tone: "blue" },
  opening: { label: "Stock initial", tone: "neutral" },
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: "Actif",
  liability: "Passif",
  equity: "Capitaux propres",
  income: "Produits",
  expense: "Charges",
};

export const PAYMENT_METHODS = [
  { value: "cash", label: "Espèces" },
  { value: "bank", label: "Banque" },
  { value: "mobile_money", label: "Mobile Money" },
] as const;

export const PRODUCT_UNITS = [
  "lot",
  "carton",
  "boîte",
  "sachet",
  "sac",
  "kg",
  "mètre",
  "barre",
  "pièce",
] as const;

export function methodLabel(value: string): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
}
