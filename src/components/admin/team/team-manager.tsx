"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS } from "@/lib/constants";
import { initials } from "@/lib/utils";
import type { Role, Staff } from "@/lib/types";

interface FormState {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  role: Role;
}

const EMPTY: FormState = {
  full_name: "",
  email: "",
  password: "",
  phone: "",
  role: "employee",
};

const roleTone = (role: Role) => (role === "admin" ? "brass" : "steel");

export function TeamManager({
  staff,
  currentId,
}: {
  staff: Staff[];
  currentId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const openNew = () => {
    setForm(EMPTY);
    setOpen(true);
  };

  const createEmployee = async () => {
    const full_name = form.full_name.trim();
    const email = form.email.trim();
    if (!full_name || !email || !form.password) {
      toast("Nom, email et mot de passe sont obligatoires.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name,
          email,
          password: form.password,
          phone: form.phone.trim() || null,
          role: form.role,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Échec de la création du compte.");
      }
      setOpen(false);
      setForm(EMPTY);
      toast("Employé ajouté.", "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Échec de la création.", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (member: Staff) => {
    if (member.id === currentId) return;
    if (
      member.is_active &&
      !window.confirm(
        `Désactiver le compte de « ${member.full_name} » ? Il ne pourra plus se connecter au back-office.`,
      )
    ) {
      return;
    }
    setBusyId(member.id);
    try {
      const { error } = await supabase
        .from("staff")
        .update({ is_active: !member.is_active })
        .eq("id", member.id);
      if (error) throw error;
      toast(member.is_active ? "Compte désactivé." : "Compte activé.", "success");
      router.refresh();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Échec de la mise à jour.",
        "error",
      );
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = async (member: Staff, role: Role) => {
    if (member.id === currentId || role === member.role) return;
    setBusyId(member.id);
    try {
      const { error } = await supabase
        .from("staff")
        .update({ role })
        .eq("id", member.id);
      if (error) throw error;
      toast("Rôle mis à jour.", "success");
      router.refresh();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Échec de la mise à jour.",
        "error",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-steel-500">
          {staff.length} membre{staff.length > 1 ? "s" : ""} de l&apos;équipe
        </p>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Ajouter un employé
        </Button>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-steel-200 bg-steel-50/70 px-4 py-3 text-sm text-steel-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brass-600" />
        <p>
          Le premier administrateur se crée directement en SQL depuis Supabase
          (voir le README). Vous pouvez ensuite ajouter et gérer les comptes ici.
        </p>
      </div>

      {staff.length > 0 ? (
        <Table>
          <THead>
            <TR>
              <TH>Membre</TH>
              <TH>Rôle</TH>
              <TH className="hidden sm:table-cell">Téléphone</TH>
              <TH className="text-center">Statut</TH>
              <TH className="text-right">Changer le rôle</TH>
            </TR>
          </THead>
          <TBody>
            {staff.map((member) => {
              const isSelf = member.id === currentId;
              const busy = busyId === member.id;
              return (
                <TR key={member.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-steel-900 text-xs font-bold text-brass-400">
                        {initials(member.full_name)}
                      </div>
                      <div className="min-w-0">
                        <span className="block font-medium text-steel-900">
                          {member.full_name}
                        </span>
                        {isSelf && (
                          <span className="text-xs text-steel-400">Vous</span>
                        )}
                      </div>
                    </div>
                  </TD>
                  <TD>
                    <Badge tone={roleTone(member.role)}>
                      {ROLE_LABELS[member.role]}
                    </Badge>
                  </TD>
                  <TD className="hidden sm:table-cell">
                    <span className="text-steel-500">{member.phone || "—"}</span>
                  </TD>
                  <TD className="text-center">
                    {isSelf ? (
                      <Badge tone={member.is_active ? "green" : "neutral"}>
                        {member.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleActive(member)}
                        disabled={busy}
                        className="transition-opacity hover:opacity-80 disabled:opacity-50"
                        title={
                          member.is_active
                            ? "Désactiver le compte"
                            : "Activer le compte"
                        }
                      >
                        <Badge tone={member.is_active ? "green" : "neutral"}>
                          {member.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </button>
                    )}
                  </TD>
                  <TD>
                    <div className="flex justify-end">
                      <Select
                        aria-label={`Rôle de ${member.full_name}`}
                        value={member.role}
                        disabled={isSelf || busy}
                        onChange={(e) =>
                          changeRole(member, e.target.value as Role)
                        }
                        className="h-9 w-auto py-1.5 text-sm"
                      >
                        <option value="employee">{ROLE_LABELS.employee}</option>
                        <option value="admin">{ROLE_LABELS.admin}</option>
                      </Select>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      ) : (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Aucun membre"
          description="Ajoutez un premier employé pour lui donner accès au back-office."
          action={
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Ajouter un employé
            </Button>
          }
        />
      )}

      <Modal
        open={open}
        onClose={() => {
          if (!saving) setOpen(false);
        }}
        title="Ajouter un employé"
        description="Un compte de connexion est créé et associé à un rôle."
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button onClick={createEmployee} loading={saving}>
              Créer le compte
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nom complet" required>
            <Input
              value={form.full_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, full_name: e.target.value }))
              }
              placeholder="Ex. Aminata Ouédraogo"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" required>
              <Input
                type="email"
                autoComplete="off"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="employe@exemple.bf"
              />
            </Field>
            <Field
              label="Mot de passe"
              required
              hint="6 caractères minimum."
            >
              <Input
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder="••••••••"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Téléphone">
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="70 00 00 00"
              />
            </Field>
            <Field label="Rôle" required>
              <Select
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value as Role }))
                }
              >
                <option value="employee">{ROLE_LABELS.employee}</option>
                <option value="admin">{ROLE_LABELS.admin}</option>
              </Select>
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
