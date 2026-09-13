// Domain types for Fay & Partenaires. These mirror the SQL schema in
// supabase/migrations. Kept hand-written (rather than generated) so the app
// builds with no Supabase project attached.

export type Role = "admin" | "employee";

export interface Staff {
  id: string;
  full_name: string;
  role: Role;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

// Full product row — visible to staff only (contains prices and exact counts).
export interface Product {
  id: string;
  slug: string;
  sku: string | null;
  name: string;
  category_id: string | null;
  description: string | null;
  material: string | null;
  // Free-form technical characteristics: diamètre, longueur, filetage, grade,
  // finition, norme… nobody has to have predicted the key.
  specs: Record<string, string>;
  unit: string; // "lot", "carton", "boîte", "kg", "sachet", "pièce"…
  pack_size: string | null; // "boîte de 100", "sac de 25 kg"…
  image_url: string | null;
  gallery: string[];
  cost_price: number; // prix d'achat — sensible, jamais public
  sale_price: number; // prix de vente — jamais affiché sur la vitrine
  quantity: number;
  low_stock_at: number | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  created_by: string | null;
}

// Public, price-free projection returned by the storefront_* RPCs.
export interface StorefrontProduct {
  id: string;
  slug: string;
  sku: string | null;
  name: string;
  category_id: string | null;
  category_slug: string | null;
  category_name: string | null;
  description: string | null;
  material: string | null;
  specs: Record<string, string>;
  unit: string;
  pack_size: string | null;
  image_url: string | null;
  gallery: string[];
  in_stock: boolean; // availability only — never the exact count
  is_featured: boolean;
}

export type StockMovementKind =
  | "receipt" // stock entrant (achat)
  | "adjustment" // correction d'inventaire
  | "sale" // sortie pour vente
  | "return" // retour client
  | "opening"; // stock initial

export interface StockMovement {
  id: string;
  product_id: string;
  kind: StockMovementKind;
  quantity: number; // signé : +entrée / -sortie
  unit_cost: number | null;
  note: string | null;
  ref_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  note: string | null;
  created_at: string;
}

export interface Purchase {
  id: string;
  supplier_id: string | null;
  occurred_at: string;
  total: number;
  method: string;
  note: string | null;
  entry_id: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface PurchaseLine {
  id: string;
  purchase_id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
}

export type SaleKind = "sale" | "return";

export interface Sale {
  id: string;
  kind: SaleKind;
  occurred_at: string;
  customer_name: string | null;
  total: number;
  method: string;
  note: string | null;
  entry_id: string | null;
  reverses_id: string | null;
  quote_id: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface SaleLine {
  id: string;
  sale_id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  line_total: number;
}

export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "income"
  | "expense";

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export type QuoteStatus =
  | "new"
  | "in_review"
  | "quoted"
  | "won"
  | "lost"
  | "cancelled";

export interface QuoteRequest {
  id: string;
  ref: string;
  status: QuoteStatus;
  customer_name: string;
  company: string | null;
  phone: string;
  email: string | null;
  message: string | null;
  note: string | null; // note interne
  quoted_total: number | null;
  quoted_at: string | null;
  handled_by: string | null;
  created_at: string;
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  unit: string | null;
  note: string | null;
}

export interface Banner {
  id: string;
  kind: "promo" | "hero_slide";
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  cta_label: string | null;
  sort_order: number;
  is_active: boolean;
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
}

export interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

// ── Report row shapes returned by the accounting RPCs (mirror 007) ──────────

export interface ChartRow {
  account_id: string;
  code: string;
  name: string;
  type: AccountType;
  description: string | null;
  is_active: boolean;
  balance: number;
  entry_count: number;
}

export interface IncomeStatementRow {
  section: "income" | "expense" | "total";
  code: string;
  name: string;
  amount: number;
}

export interface JournalRow {
  entry_id: string;
  occurred_at: string;
  label: string;
  memo: string | null;
  details: Record<string, unknown>;
  amount: number;
  debit_names: string | null;
  credit_names: string | null;
  direction: "in" | "out" | "transfer";
  reversed: boolean;
  is_reversal: boolean;
  recorded_by: string | null;
}
