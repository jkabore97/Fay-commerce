"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/field";
import { ImageUpload } from "@/components/admin/image-upload";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { PRODUCT_UNITS } from "@/lib/constants";
import type {
  CategoryOption,
  ProductRow,
} from "@/components/admin/products/products-manager";

export function ProductForm({
  product,
  categories,
  isAdmin,
  onSuccess,
  onCancel,
}: {
  product?: ProductRow;
  categories: CategoryOption[];
  isAdmin: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const isEdit = !!product;
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  // In edit mode the slug is already set and must stay stable, so never
  // auto-derive it from the name there.
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [sku, setSku] = useState(product?.sku ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [unit, setUnit] = useState(product?.unit ?? "lot");
  const [packSize, setPackSize] = useState(product?.pack_size ?? "");
  const [material, setMaterial] = useState(product?.material ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [salePrice, setSalePrice] = useState(
    product ? String(product.sale_price) : "",
  );
  const [costPrice, setCostPrice] = useState(
    product ? String(product.cost_price) : "",
  );
  const [lowStockAt, setLowStockAt] = useState(
    product?.low_stock_at != null ? String(product.low_stock_at) : "",
  );
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [imageUrl, setImageUrl] = useState<string | null>(
    product?.image_url ?? null,
  );
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>(
    product
      ? Object.entries(product.specs ?? {}).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      : [],
  );
  const [saving, setSaving] = useState(false);

  const onNameChange = (v: string) => {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const updateSpec = (i: number, field: "key" | "value", value: string) =>
    setSpecs((s) =>
      s.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)),
    );
  const addSpec = () => setSpecs((s) => [...s, { key: "", value: "" }]);
  const removeSpec = (i: number) =>
    setSpecs((s) => s.filter((_, idx) => idx !== i));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast("Le nom du produit est obligatoire.", "error");
      return;
    }
    if (!slug.trim()) {
      toast("Le slug est obligatoire.", "error");
      return;
    }

    const specsObj = Object.fromEntries(
      specs
        .map((s) => [s.key.trim(), s.value.trim()] as const)
        .filter(([k]) => k),
    );

    const payload: Record<string, unknown> = {
      name: name.trim(),
      slug: slug.trim(),
      sku: sku.trim() || null,
      category_id: categoryId || null,
      unit,
      pack_size: packSize.trim() || null,
      material: material.trim() || null,
      description: description.trim() || null,
      sale_price: Number(salePrice) || 0,
      low_stock_at: lowStockAt.trim() === "" ? null : Number(lowStockAt),
      is_featured: isFeatured,
      is_active: isActive,
      image_url: imageUrl,
      specs: specsObj,
    };
    // prix d'achat — admin only; never touched by an employee edit.
    if (isAdmin) payload.cost_price = Number(costPrice) || 0;

    setSaving(true);
    const supabase = createClient();
    const { error } = isEdit
      ? await supabase.from("products").update(payload).eq("id", product!.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);

    if (error) {
      toast(error.message, "error");
      return;
    }
    toast(isEdit ? "Produit mis à jour." : "Produit créé.", "success");
    router.refresh();
    onSuccess();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom du produit" required>
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Vis à tête hexagonale M8×40"
            required
          />
        </Field>
        <Field
          label="Slug (URL)"
          required
          hint="Identifiant unique dans l'URL. Généré automatiquement, modifiable."
        >
          <Input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="vis-tete-hexagonale-m8-40"
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Référence (SKU)">
          <Input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="VIS-HEX-M8-40"
          />
        </Field>
        <Field label="Catégorie">
          <Select
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">— Aucune —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Unité de vente">
          <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {PRODUCT_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Conditionnement" hint="Ex. boîte de 100, sac de 25 kg.">
          <Input
            value={packSize}
            onChange={(e) => setPackSize(e.target.value)}
            placeholder="boîte de 100"
          />
        </Field>
      </div>

      <Field label="Matière">
        <Input
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          placeholder="Acier zingué, inox A2…"
        />
      </Field>

      <Field label="Description">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description commerciale, usages, normes…"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Prix de vente (FCFA)">
          <Input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            placeholder="0"
          />
        </Field>
        {isAdmin && (
          <Field
            label="Prix d'achat (FCFA)"
            hint="Confidentiel — jamais affiché sur la vitrine."
          >
            <Input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="0"
            />
          </Field>
        )}
        <Field
          label="Seuil de stock bas"
          hint="Alerte lorsque la quantité atteint ce niveau."
        >
          <Input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={lowStockAt}
            onChange={(e) => setLowStockAt(e.target.value)}
            placeholder="Ex. 10"
          />
        </Field>
      </div>

      {isEdit ? (
        <Field
          label="Stock actuel"
          hint="Le stock se modifie dans « Stock & mouvements »."
        >
          <Input
            value={`${formatNumber(product!.quantity)} ${product!.unit}`}
            disabled
          />
        </Field>
      ) : (
        <Field
          label="Stock initial"
          hint="Le stock démarre à 0. Ajoutez-le ensuite dans « Stock & mouvements »."
        >
          <Input value="0" disabled />
        </Field>
      )}

      <ImageUpload
        value={imageUrl}
        onChange={setImageUrl}
        folder="products"
        label="Image du produit"
      />

      {/* Specs key/value editor -> products.specs (jsonb) */}
      <div>
        <Label>Caractéristiques techniques</Label>
        <div className="space-y-2">
          {specs.length === 0 && (
            <p className="text-xs text-steel-400">
              Aucune caractéristique. Ajoutez diamètre, longueur, filetage,
              finition…
            </p>
          )}
          {specs.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={row.key}
                onChange={(e) => updateSpec(i, "key", e.target.value)}
                placeholder="Diamètre"
                className="flex-1"
              />
              <Input
                value={row.value}
                onChange={(e) => updateSpec(i, "value", e.target.value)}
                placeholder="8 mm"
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => removeSpec(i)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-steel-200 text-steel-400 hover:border-red-200 hover:text-red-600"
                aria-label="Retirer la caractéristique"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addSpec}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brass-600 hover:text-brass-700"
        >
          <Plus className="h-4 w-4" /> Ajouter une caractéristique
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-steel-200 bg-white px-3.5 py-2.5">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="h-4 w-4 rounded border-steel-300 text-brass-500 focus:ring-brass-400"
          />
          <span className="text-sm font-medium text-steel-700">
            Mettre en vedette
          </span>
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-steel-200 bg-white px-3.5 py-2.5">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-steel-300 text-brass-500 focus:ring-brass-400"
          />
          <span className="text-sm font-medium text-steel-700">
            Actif (visible sur la vitrine)
          </span>
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-steel-100 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" loading={saving}>
          {isEdit ? "Enregistrer" : "Créer le produit"}
        </Button>
      </div>
    </form>
  );
}
