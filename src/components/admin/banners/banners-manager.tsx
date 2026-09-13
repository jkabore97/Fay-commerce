"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarRange,
  ExternalLink,
  Image as ImageIcon,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { ImageUpload } from "@/components/admin/image-upload";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { mediaUrl } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import type { Banner } from "@/lib/types";

type BannerKind = "promo" | "hero_slide";

const KIND_META: Record<BannerKind, { label: string; tone: "brass" | "blue" }> = {
  promo: { label: "Promotion", tone: "brass" },
  hero_slide: { label: "Slide accueil", tone: "blue" },
};

interface FormState {
  kind: BannerKind;
  title: string;
  subtitle: string;
  image_url: string | null;
  link_url: string;
  cta_label: string;
  sort_order: string;
  is_active: boolean;
  starts_on: string;
  ends_on: string;
}

const EMPTY: FormState = {
  kind: "promo",
  title: "",
  subtitle: "",
  image_url: null,
  link_url: "",
  cta_label: "",
  sort_order: "0",
  is_active: true,
  starts_on: "",
  ends_on: "",
};

function dateWindowLabel(starts: string | null, ends: string | null): string {
  if (starts && ends) return `Du ${formatDate(starts)} au ${formatDate(ends)}`;
  if (starts) return `À partir du ${formatDate(starts)}`;
  if (ends) return `Jusqu'au ${formatDate(ends)}`;
  return "Toujours affichée";
}

export function BannersManager({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      kind: b.kind,
      title: b.title ?? "",
      subtitle: b.subtitle ?? "",
      image_url: b.image_url,
      link_url: b.link_url ?? "",
      cta_label: b.cta_label ?? "",
      sort_order: String(b.sort_order),
      is_active: b.is_active,
      starts_on: b.starts_on ?? "",
      ends_on: b.ends_on ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.image_url) {
      toast("Une image est obligatoire pour la bannière.", "error");
      return;
    }
    if (form.starts_on && form.ends_on && form.ends_on < form.starts_on) {
      toast("La date de fin doit suivre la date de début.", "error");
      return;
    }
    const payload = {
      kind: form.kind,
      title: form.title.trim() || null,
      subtitle: form.subtitle.trim() || null,
      image_url: form.image_url,
      link_url: form.link_url.trim() || null,
      cta_label: form.cta_label.trim() || null,
      sort_order: Number.parseInt(form.sort_order, 10) || 0,
      is_active: form.is_active,
      starts_on: form.starts_on || null,
      ends_on: form.ends_on || null,
    };
    setSaving(true);
    try {
      const { error } = editing
        ? await supabase.from("banners").update(payload).eq("id", editing.id)
        : await supabase.from("banners").insert(payload);
      if (error) throw error;
      setOpen(false);
      toast(editing ? "Bannière mise à jour." : "Bannière créée.", "success");
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

  const toggleActive = async (b: Banner) => {
    setTogglingId(b.id);
    try {
      const { error } = await supabase
        .from("banners")
        .update({ is_active: !b.is_active })
        .eq("id", b.id);
      if (error) throw error;
      toast(!b.is_active ? "Bannière activée." : "Bannière masquée.", "success");
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

  const remove = async (b: Banner) => {
    if (
      !window.confirm(
        `Supprimer cette bannière${b.title ? ` « ${b.title} »` : ""} ? Cette action est irréversible.`,
      )
    ) {
      return;
    }
    setDeletingId(b.id);
    try {
      const { error } = await supabase.from("banners").delete().eq("id", b.id);
      if (error) throw error;
      toast("Bannière supprimée.", "success");
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
          {banners.length} bannière{banners.length > 1 ? "s" : ""}
        </p>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Nouvelle bannière
        </Button>
      </div>

      {banners.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {banners.map((b) => {
            const img = mediaUrl(b.image_url);
            const meta = KIND_META[b.kind];
            return (
              <div
                key={b.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-steel-100 bg-white shadow-card"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-steel-100">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-steel-300" />
                    </div>
                  )}
                  <div className="absolute left-2 top-2">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-steel-900">
                      {b.title || "Sans titre"}
                    </p>
                    {b.subtitle && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-steel-500">
                        {b.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-steel-500">
                    <CalendarRange className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {dateWindowLabel(b.starts_on, b.ends_on)}
                    </span>
                  </div>

                  {b.link_url && (
                    <div className="flex items-center gap-1.5 text-xs text-steel-500">
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {b.cta_label ? `${b.cta_label} → ` : ""}
                        {b.link_url}
                      </span>
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-steel-100 pt-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(b)}
                      disabled={togglingId === b.id}
                      className="transition-opacity hover:opacity-80 disabled:opacity-50"
                      title={b.is_active ? "Masquer la bannière" : "Activer la bannière"}
                    >
                      <Badge tone={b.is_active ? "green" : "neutral"}>
                        {b.is_active ? "Active" : "Masquée"}
                      </Badge>
                    </button>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(b)}>
                        <Pencil className="h-4 w-4" /> Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => remove(b)}
                        loading={deletingId === b.id}
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Supprimer</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<ImageIcon className="h-6 w-6" />}
          title="Aucune bannière"
          description="Ajoutez un visuel promotionnel ou un slide pour le carrousel de la page d'accueil."
          action={
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Nouvelle bannière
            </Button>
          }
        />
      )}

      <Modal
        open={open}
        onClose={() => {
          if (!saving) setOpen(false);
        }}
        title={editing ? "Modifier la bannière" : "Nouvelle bannière"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={save} loading={saving}>
              {editing ? "Enregistrer" : "Créer"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Type" required>
            <Select
              value={form.kind}
              onChange={(e) =>
                setForm((f) => ({ ...f, kind: e.target.value as BannerKind }))
              }
            >
              <option value="promo">Promotion (visuel promotionnel)</option>
              <option value="hero_slide">Slide d'accueil (carrousel)</option>
            </Select>
          </Field>

          <ImageUpload
            value={form.image_url}
            onChange={(v) => setForm((f) => ({ ...f, image_url: v }))}
            folder="banners"
            label="Image"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Titre">
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex. Soldes de rentrée"
              />
            </Field>
            <Field label="Sous-titre">
              <Input
                value={form.subtitle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subtitle: e.target.value }))
                }
                placeholder="Ex. -20% sur toute la visserie"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Lien" hint="Où mène la bannière au clic (optionnel).">
              <Input
                type="url"
                value={form.link_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, link_url: e.target.value }))
                }
                placeholder="/produits ou https://…"
              />
            </Field>
            <Field label="Libellé du bouton">
              <Input
                value={form.cta_label}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cta_label: e.target.value }))
                }
                placeholder="Ex. Découvrir l'offre"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Début d'affichage" hint="Optionnel.">
              <Input
                type="date"
                value={form.starts_on}
                onChange={(e) =>
                  setForm((f) => ({ ...f, starts_on: e.target.value }))
                }
              />
            </Field>
            <Field label="Fin d'affichage" hint="Optionnel.">
              <Input
                type="date"
                value={form.ends_on}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ends_on: e.target.value }))
                }
              />
            </Field>
          </div>

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
