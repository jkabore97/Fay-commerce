"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { ImageUpload } from "@/components/admin/image-upload";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { slugify, mediaUrl } from "@/lib/utils";
import type { Category } from "@/lib/types";

interface FormState {
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  sort_order: string;
  is_active: boolean;
}

const EMPTY: FormState = {
  name: "",
  slug: "",
  description: "",
  image_url: null,
  sort_order: "0",
  is_active: true,
};

export function CategoriesManager({
  categories,
  isAdmin,
}: {
  categories: Category[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setSlugTouched(false);
    setOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      image_url: c.image_url,
      sort_order: String(c.sort_order),
      is_active: c.is_active,
    });
    setSlugTouched(true);
    setOpen(true);
  };

  const setName = (name: string) => {
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
  };

  const setSlug = (slug: string) => {
    setSlugTouched(true);
    setForm((f) => ({ ...f, slug }));
  };

  const save = async () => {
    const name = form.name.trim();
    if (!name) {
      toast("Le nom est obligatoire.", "error");
      return;
    }
    const slug = form.slug.trim() || slugify(name);
    if (!slug) {
      toast("Le slug est invalide.", "error");
      return;
    }
    const payload = {
      name,
      slug,
      description: form.description.trim() || null,
      image_url: form.image_url,
      sort_order: Number.parseInt(form.sort_order, 10) || 0,
      is_active: form.is_active,
    };
    setSaving(true);
    try {
      const { error } = editing
        ? await supabase.from("categories").update(payload).eq("id", editing.id)
        : await supabase.from("categories").insert(payload);
      if (error) throw error;
      setOpen(false);
      toast(editing ? "Catégorie mise à jour." : "Catégorie créée.", "success");
      router.refresh();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Échec de l'enregistrement.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: Category) => {
    setTogglingId(c.id);
    try {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: !c.is_active })
        .eq("id", c.id);
      if (error) throw error;
      toast(!c.is_active ? "Catégorie activée." : "Catégorie masquée.", "success");
      router.refresh();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Échec de la mise à jour.",
        "error",
      );
    } finally {
      setTogglingId(null);
    }
  };

  const remove = async (c: Category) => {
    if (
      !window.confirm(
        `Supprimer la catégorie « ${c.name} » ? Cette action est irréversible.`,
      )
    ) {
      return;
    }
    setDeletingId(c.id);
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", c.id);
      if (error) throw error;
      toast("Catégorie supprimée.", "success");
      router.refresh();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Échec de la suppression.",
        "error",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-steel-500">
          {categories.length} catégorie{categories.length > 1 ? "s" : ""}
        </p>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Nouvelle catégorie
        </Button>
      </div>

      {categories.length > 0 ? (
        <Table>
          <THead>
            <TR>
              <TH>Catégorie</TH>
              <TH>Slug</TH>
              <TH className="hidden md:table-cell">Description</TH>
              <TH className="text-center">Ordre</TH>
              <TH className="text-center">Statut</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {categories.map((c) => {
              const thumb = mediaUrl(c.image_url);
              return (
                <TR key={c.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-steel-200 bg-steel-50">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Tag className="h-5 w-5 text-steel-300" />
                        )}
                      </div>
                      <span className="font-medium text-steel-900">{c.name}</span>
                    </div>
                  </TD>
                  <TD>
                    <span className="font-mono text-xs text-steel-500">
                      {c.slug}
                    </span>
                  </TD>
                  <TD className="hidden max-w-xs md:table-cell">
                    <span className="block truncate text-steel-500">
                      {c.description || "—"}
                    </span>
                  </TD>
                  <TD className="text-center tabular-nums">{c.sort_order}</TD>
                  <TD className="text-center">
                    <button
                      type="button"
                      onClick={() => toggleActive(c)}
                      disabled={togglingId === c.id}
                      className="transition-opacity hover:opacity-80 disabled:opacity-50"
                      title={c.is_active ? "Masquer la catégorie" : "Activer la catégorie"}
                    >
                      <Badge tone={c.is_active ? "green" : "neutral"}>
                        {c.is_active ? "Active" : "Masquée"}
                      </Badge>
                    </button>
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-4 w-4" /> Modifier
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => remove(c)}
                          loading={deletingId === c.id}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Supprimer</span>
                        </Button>
                      )}
                    </div>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      ) : (
        <EmptyState
          icon={<Tag className="h-6 w-6" />}
          title="Aucune catégorie"
          description="Créez votre première famille de produits pour organiser le catalogue."
          action={
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Nouvelle catégorie
            </Button>
          }
        />
      )}

      <Modal
        open={open}
        onClose={() => {
          if (!saving) setOpen(false);
        }}
        title={editing ? "Modifier la catégorie" : "Nouvelle catégorie"}
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button onClick={save} loading={saving}>
              {editing ? "Enregistrer" : "Créer"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom" required>
              <Input
                value={form.name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Vis à bois"
              />
            </Field>
            <Field label="Slug" hint="Identifiant URL, généré depuis le nom.">
              <Input
                value={form.slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="vis-a-bois"
              />
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Courte description de la famille de produits (optionnel)."
            />
          </Field>

          <ImageUpload
            value={form.image_url}
            onChange={(v) => setForm((f) => ({ ...f, image_url: v }))}
            folder="categories"
            label="Image"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Ordre d'affichage"
              hint="Les plus petits nombres apparaissent en premier."
            >
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sort_order: e.target.value }))
                }
              />
            </Field>
            <div className="flex items-end pb-2.5">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-steel-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_active: e.target.checked }))
                  }
                  className="h-4 w-4 accent-brass-500"
                />
                Active (visible sur la vitrine)
              </label>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
