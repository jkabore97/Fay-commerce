"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Boxes,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { ProductImage } from "@/components/site/product-image";
import { ProductForm } from "@/components/admin/products/product-form";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { formatMoney, formatNumber } from "@/lib/format";
import type { Category, Product } from "@/lib/types";

export type ProductRow = Product & {
  categories: { name: string; slug: string } | null;
};
export type CategoryOption = Pick<
  Category,
  "id" | "name" | "slug" | "sort_order"
>;

export function ProductsManager({
  products,
  categories,
  isAdmin,
}: {
  products: ProductRow[];
  categories: CategoryOption[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // The "Nouveau produit" action in the page header links to ?nouveau=1;
  // open the create modal and clean the URL back up.
  useEffect(() => {
    if (searchParams.get("nouveau") === "1") {
      setCreating(true);
      router.replace("/admin/produits", { scroll: false });
    }
  }, [searchParams, router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter && p.category_id !== categoryFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.material ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, search, categoryFilter]);

  const colCount = isAdmin ? 8 : 7;

  const isLow = (p: ProductRow) =>
    p.low_stock_at != null && p.quantity <= p.low_stock_at;

  const toggleActive = async (p: ProductRow) => {
    setBusyId(p.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);
    setBusyId(null);
    if (error) {
      toast(error.message, "error");
      return;
    }
    toast(p.is_active ? "Produit désactivé." : "Produit activé.", "success");
    router.refresh();
  };

  const removeProduct = async (p: ProductRow) => {
    if (
      !window.confirm(
        `Supprimer « ${p.name} » ? Cette action est définitive.`,
      )
    )
      return;
    setBusyId(p.id);
    const supabase = createClient();
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    setBusyId(null);
    if (error) {
      toast(error.message, "error");
      return;
    }
    toast("Produit supprimé.", "success");
    router.refresh();
  };

  if (products.length === 0) {
    return (
      <>
        <EmptyState
          icon={<Boxes className="h-6 w-6" />}
          title="Aucun produit"
          description="Créez votre première fiche produit pour alimenter le catalogue et la vitrine."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Nouveau produit
            </Button>
          }
        />
        <Modal
          open={creating}
          onClose={() => setCreating(false)}
          title="Nouveau produit"
          size="xl"
        >
          <ProductForm
            categories={categories}
            isAdmin={isAdmin}
            onSuccess={() => setCreating(false)}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit, SKU, matière…"
              className="pl-9"
            />
          </div>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="sm:w-56"
          >
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <p className="text-sm text-steel-500">
          {filtered.length} produit{filtered.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      <Table>
        <THead>
          <TR>
            <TH>Produit</TH>
            <TH>SKU</TH>
            <TH>Catégorie</TH>
            <TH>Stock</TH>
            <TH>Prix de vente</TH>
            {isAdmin && <TH>Prix d&apos;achat</TH>}
            <TH>Statut</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {filtered.length === 0 ? (
            <TR>
              <TD colSpan={colCount} className="py-10 text-center text-steel-400">
                Aucun produit ne correspond à votre recherche.
              </TD>
            </TR>
          ) : (
            filtered.map((p) => (
              <TR key={p.id}>
                <TD>
                  <div className="flex items-center gap-3">
                    <ProductImage
                      src={p.image_url}
                      alt={p.name}
                      categorySlug={p.categories?.slug}
                      className="h-11 w-11 shrink-0"
                      rounded="rounded-lg"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-steel-900">
                        {p.name}
                      </p>
                      {p.pack_size && (
                        <p className="truncate text-xs text-steel-400">
                          {p.pack_size}
                        </p>
                      )}
                    </div>
                  </div>
                </TD>
                <TD className="whitespace-nowrap font-mono text-xs text-steel-500">
                  {p.sku || "—"}
                </TD>
                <TD className="whitespace-nowrap">
                  {p.categories?.name ?? "—"}
                </TD>
                <TD className="whitespace-nowrap">
                  {isLow(p) ? (
                    <Badge tone="red">
                      {formatNumber(p.quantity)} {p.unit}
                    </Badge>
                  ) : (
                    <span className="text-steel-700">
                      {formatNumber(p.quantity)} {p.unit}
                    </span>
                  )}
                </TD>
                <TD className="whitespace-nowrap font-medium text-steel-900">
                  {formatMoney(p.sale_price)}
                </TD>
                {isAdmin && (
                  <TD className="whitespace-nowrap text-steel-500">
                    {formatMoney(p.cost_price)}
                  </TD>
                )}
                <TD>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={p.is_active ? "green" : "neutral"}>
                      {p.is_active ? "Actif" : "Inactif"}
                    </Badge>
                    {p.is_featured && (
                      <Badge tone="brass">
                        <Star className="h-3 w-3" /> Vedette
                      </Badge>
                    )}
                  </div>
                </TD>
                <TD>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2"
                      title={p.is_active ? "Désactiver" : "Activer"}
                      disabled={busyId === p.id}
                      onClick={() => toggleActive(p)}
                    >
                      {p.is_active ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2 text-red-600 hover:bg-red-50"
                        title="Supprimer"
                        disabled={busyId === p.id}
                        onClick={() => removeProduct(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      {/* Create */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Nouveau produit"
        size="xl"
      >
        <ProductForm
          categories={categories}
          isAdmin={isAdmin}
          onSuccess={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      </Modal>

      {/* Edit */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Modifier le produit"
        size="xl"
      >
        {editing && (
          <ProductForm
            product={editing}
            categories={categories}
            isAdmin={isAdmin}
            onSuccess={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
