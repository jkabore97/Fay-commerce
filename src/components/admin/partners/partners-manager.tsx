"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Handshake, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Card, EmptyState } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { ImageUpload } from "@/components/admin/image-upload";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { mediaUrl } from "@/lib/utils";
import type { Partner } from "@/lib/types";

interface FormState {
  name: string;
  logo_url: string | null;
  link_url: string;
  sort_order: string;
  is_active: boolean;
}

const EMPTY: FormState = {
  name: "",
  logo_url: null,
  link_url: "",
  sort_order: "0",
  is_active: true,
};

export function PartnersManager({ partners }: { partners: Partner[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (p: Partner) => {
    setEditing(p);
    setForm({
      name: p.name,
      logo_url: p.logo_url,
      link_url: p.link_url ?? "",
      sort_order: String(p.sort_order),
      is_active: p.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    const name = form.name.trim();
    if (!name) {
      toast("Le nom est obligatoire.", "error");
      return;
    }
    const payload = {
      name,
      logo_url: form.logo_url,
      link_url: form.link_url.trim() || null,
      sort_order: Number.parseInt(form.sort_order, 10) || 0,
      is_active: form.is_active,
    };
    setSaving(true);
    try {
      const { error } = editing
        ? await supabase.from("partners").update(payload).eq("id", editing.id)
        : await supabase.from("partners").insert(payload);
      if (error) throw error;
      setOpen(false);
      toast(editing ? "Partenaire mis à jour." : "Partenaire créé.", "success");
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

  const toggleActive = async (p: Partner) => {
    setTogglingId(p.id);
    try {
      const { error } = await supabase
        .from("partners")
        .update({ is_active: !p.is_active })
        .eq("id", p.id);
      if (error) throw error;
      toast(!p.is_active ? "Partenaire activé." : "Partenaire masqué.", "success");
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

  const remove = async (p: Partner) => {
    if (
      !window.confirm(
        `Supprimer le partenaire « ${p.name} » ? Cette action est irréversible.`,
      )
    ) {
      return;
    }
    setDeletingId(p.id);
    try {
      const { error } = await supabase.from("partners").delete().eq("id", p.id);
      if (error) throw error;
      toast("Partenaire supprimé.", "success");
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
          {partners.length} partenaire{partners.length > 1 ? "s" : ""}
        </p>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Nouveau partenaire
        </Button>
      </div>

      {partners.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {partners.map((p) => {
            const logo = mediaUrl(p.logo_url);
            return (
              <Card key={p.id} className="flex flex-col overflow-hidden p-4">
                <div className="flex h-28 items-center justify-center overflow-hidden rounded-xl border border-steel-100 bg-steel-50 p-4">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo}
                      alt={p.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Handshake className="h-8 w-8 text-steel-300" />
                  )}
                </div>

                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-steel-900">
                      {p.name}
                    </p>
                    {p.link_url ? (
                      <a
                        href={p.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 inline-flex max-w-full items-center gap-1 text-xs text-cobalt-600 hover:text-cobalt-700"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{p.link_url}</span>
                      </a>
                    ) : (
                      <p className="mt-0.5 text-xs text-steel-400">Aucun lien</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-steel-400">
                    #{p.sort_order}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-steel-100 pt-3">
                  <button
                    type="button"
                    onClick={() => toggleActive(p)}
                    disabled={togglingId === p.id}
                    className="transition-opacity hover:opacity-80 disabled:opacity-50"
                    title={p.is_active ? "Masquer le partenaire" : "Activer le partenaire"}
                  >
                    <Badge tone={p.is_active ? "green" : "neutral"}>
                      {p.is_active ? "Actif" : "Masqué"}
                    </Badge>
                  </button>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" /> Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => remove(p)}
                      loading={deletingId === p.id}
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Supprimer</span>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Handshake className="h-6 w-6" />}
          title="Aucun partenaire"
          description="Ajoutez les logos de vos partenaires pour les afficher sur la vitrine."
          action={
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Nouveau partenaire
            </Button>
          }
        />
      )}

      <Modal
        open={open}
        onClose={() => {
          if (!saving) setOpen(false);
        }}
        title={editing ? "Modifier le partenaire" : "Nouveau partenaire"}
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
          <Field label="Nom" required>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex. Fischer"
            />
          </Field>

          <ImageUpload
            value={form.logo_url}
            onChange={(v) => setForm((f) => ({ ...f, logo_url: v }))}
            folder="partners"
            label="Logo"
          />

          <Field
            label="Lien"
            hint="Site web du partenaire (optionnel)."
          >
            <Input
              type="url"
              value={form.link_url}
              onChange={(e) =>
                setForm((f) => ({ ...f, link_url: e.target.value }))
              }
              placeholder="https://exemple.com"
            />
          </Field>

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
                  className="h-4 w-4 accent-cobalt-500"
                />
                Actif (visible sur la vitrine)
              </label>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
