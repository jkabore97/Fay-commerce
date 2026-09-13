"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Card, EmptyState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { Supplier } from "@/lib/types";

interface FormState {
  name: string;
  phone: string;
  email: string;
  note: string;
}

const EMPTY: FormState = { name: "", phone: "", email: "", note: "" };

export function SuppliersManager({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [addForm, setAddForm] = useState<FormState>(EMPTY);
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const buildPayload = (f: FormState) => ({
    name: f.name.trim(),
    phone: f.phone.trim() || null,
    email: f.email.trim() || null,
    note: f.note.trim() || null,
  });

  const add = async () => {
    const payload = buildPayload(addForm);
    if (!payload.name) {
      toast("Le nom du fournisseur est obligatoire.", "error");
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase.from("suppliers").insert(payload);
      if (error) throw error;
      setAddForm(EMPTY);
      toast("Fournisseur ajouté.", "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Échec de l'ajout.", "error");
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (s: Supplier) => {
    setEditingId(s.id);
    setEditForm({
      name: s.name,
      phone: s.phone ?? "",
      email: s.email ?? "",
      note: s.note ?? "",
    });
  };

  const cancelEdit = () => {
    if (savingEdit) return;
    setEditingId(null);
    setEditForm(EMPTY);
  };

  const saveEdit = async (id: string) => {
    const payload = buildPayload(editForm);
    if (!payload.name) {
      toast("Le nom du fournisseur est obligatoire.", "error");
      return;
    }
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from("suppliers")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
      setEditingId(null);
      toast("Fournisseur mis à jour.", "success");
      router.refresh();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Échec de la mise à jour.",
        "error",
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const remove = async (s: Supplier) => {
    if (
      !window.confirm(
        `Supprimer le fournisseur « ${s.name} » ? Les achats déjà enregistrés le conserveront comme non précisé.`,
      )
    ) {
      return;
    }
    setDeletingId(s.id);
    try {
      const { error } = await supabase.from("suppliers").delete().eq("id", s.id);
      if (error) throw error;
      toast("Fournisseur supprimé.", "success");
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
    <Card className="p-5">
      {/* Add form */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Nom" required>
          <Input
            value={addForm.name}
            onChange={(e) =>
              setAddForm((f) => ({ ...f, name: e.target.value }))
            }
            placeholder="Ex. Quincaillerie du Faso"
          />
        </Field>
        <Field label="Téléphone">
          <Input
            value={addForm.phone}
            onChange={(e) =>
              setAddForm((f) => ({ ...f, phone: e.target.value }))
            }
            placeholder="70 00 00 00"
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={addForm.email}
            onChange={(e) =>
              setAddForm((f) => ({ ...f, email: e.target.value }))
            }
            placeholder="contact@exemple.bf"
          />
        </Field>
        <Field label="Note">
          <Input
            value={addForm.note}
            onChange={(e) =>
              setAddForm((f) => ({ ...f, note: e.target.value }))
            }
            placeholder="Optionnel"
          />
        </Field>
      </div>
      <div className="mt-3 flex justify-end">
        <Button onClick={add} loading={adding}>
          <Plus className="h-4 w-4" /> Ajouter le fournisseur
        </Button>
      </div>

      {/* List */}
      <div className="mt-5 border-t border-steel-100 pt-5">
        {suppliers.length > 0 ? (
          <ul className="divide-y divide-steel-100">
            {suppliers.map((s) => {
              const editing = editingId === s.id;
              if (editing) {
                return (
                  <li key={s.id} className="py-3">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="Nom" required>
                        <Input
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, name: e.target.value }))
                          }
                        />
                      </Field>
                      <Field label="Téléphone">
                        <Input
                          value={editForm.phone}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, phone: e.target.value }))
                          }
                        />
                      </Field>
                      <Field label="Email">
                        <Input
                          type="email"
                          value={editForm.email}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, email: e.target.value }))
                          }
                        />
                      </Field>
                      <Field label="Note">
                        <Input
                          value={editForm.note}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, note: e.target.value }))
                          }
                        />
                      </Field>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelEdit}
                        disabled={savingEdit}
                      >
                        <X className="h-4 w-4" /> Annuler
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveEdit(s.id)}
                        loading={savingEdit}
                      >
                        <Check className="h-4 w-4" /> Enregistrer
                      </Button>
                    </div>
                  </li>
                );
              }
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-steel-900">{s.name}</p>
                    <p className="truncate text-xs text-steel-500">
                      {[s.phone, s.email, s.note].filter(Boolean).join(" · ") ||
                        "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(s)}
                    >
                      <Pencil className="h-4 w-4" /> Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => remove(s)}
                      loading={deletingId === s.id}
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Supprimer</span>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            className="border-0 py-8"
            icon={<Building2 className="h-6 w-6" />}
            title="Aucun fournisseur"
            description="Ajoutez vos fournisseurs pour les associer à vos achats."
          />
        )}
      </div>
    </Card>
  );
}
