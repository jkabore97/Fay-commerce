"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Filter,
  Layers,
  ListTree,
  Plus,
  RotateCcw,
  Scale,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { Card, EmptyState, Stat } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import {
  formatMoney,
  formatNumber,
  formatDate,
  formatDateTime,
} from "@/lib/format";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { EntryForm } from "@/components/admin/accounting/entry-form";
import type {
  AccountType,
  ChartRow,
  IncomeStatementRow,
  JournalRow,
} from "@/lib/types";

// balance_sheet() and trial_balance() have no hand-written row type in
// lib/types, so mirror their SQL return shapes here (see 0003_accounting.sql).
interface BalanceRow {
  section: "asset" | "liability" | "equity" | "total";
  code: string;
  name: string;
  amount: number;
}
interface TrialRow {
  code: string;
  name: string;
  type: AccountType;
  total_debit: number;
  total_credit: number;
  balance: number;
}

type TabKey = "resultat" | "bilan" | "balance" | "journal" | "plan";

const TABS: { key: TabKey; label: string; icon: typeof BookOpen }[] = [
  { key: "resultat", label: "Résultat", icon: TrendingUp },
  { key: "bilan", label: "Bilan", icon: Scale },
  { key: "balance", label: "Balance", icon: Layers },
  { key: "journal", label: "Grand livre", icon: BookOpen },
  { key: "plan", label: "Plan comptable", icon: ListTree },
];

const DIRECTION: Record<
  JournalRow["direction"],
  { label: string; tone: "green" | "red" | "blue" }
> = {
  in: { label: "Entrée", tone: "green" },
  out: { label: "Sortie", tone: "red" },
  transfer: { label: "Transfert", tone: "blue" },
};

interface AccountForm {
  name: string;
  type: AccountType;
  code: string;
  description: string;
}
const EMPTY_ACCOUNT: AccountForm = {
  name: "",
  type: "expense",
  code: "",
  description: "",
};

export function AccountingTabs({
  income,
  balance,
  trial,
  chart,
  journal,
  from,
  to,
}: {
  income: IncomeStatementRow[];
  balance: BalanceRow[];
  trial: TrialRow[];
  chart: ChartRow[];
  journal: JournalRow[];
  from: string;
  to: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [tab, setTab] = useState<TabKey>("resultat");
  const [entryOpen, setEntryOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const [fromInput, setFromInput] = useState(from);
  const [toInput, setToInput] = useState(to);

  const [accForm, setAccForm] = useState<AccountForm>(EMPTY_ACCOUNT);
  const [savingAccount, setSavingAccount] = useState(false);

  const applyRange = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (fromInput) params.set("from", fromInput);
    if (toInput) params.set("to", toInput);
    router.push(`/admin/comptabilite?${params.toString()}`);
  };

  const closeAccount = () => {
    if (!savingAccount) setAccountOpen(false);
  };

  const submitAccount = async () => {
    if (!accForm.name.trim()) {
      toast("Le nom du compte est obligatoire.", "error");
      return;
    }
    setSavingAccount(true);
    try {
      const { error } = await supabase.rpc("create_account", {
        p_name: accForm.name.trim(),
        p_type: accForm.type,
        p_description: accForm.description.trim() || null,
        p_code: accForm.code.trim() || null,
      });
      if (error) throw error;
      setAccountOpen(false);
      setAccForm(EMPTY_ACCOUNT);
      toast("Compte créé.", "success");
      router.refresh();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Échec de la création du compte.",
        "error",
      );
    } finally {
      setSavingAccount(false);
    }
  };

  // ── Résultat ──────────────────────────────────────────────────────────────
  const totalOf = (code: string) =>
    income.find((r) => r.section === "total" && r.code === code)?.amount ?? 0;
  const produits = totalOf("1");
  const charges = totalOf("2");
  const resultat = totalOf("3");
  const incomeLines = income.filter((r) => r.section === "income");
  const expenseLines = income.filter((r) => r.section === "expense");

  // ── Bilan ───────────────────────────────────────────────────────────────
  const assetRows = balance.filter((r) => r.section === "asset");
  const passifRows = balance.filter(
    (r) => r.section === "liability" || r.section === "equity",
  );
  const totalActif =
    balance.find((r) => r.section === "total" && r.code === "1")?.amount ?? 0;
  const totalPassif =
    balance.find((r) => r.section === "total" && r.code === "2")?.amount ?? 0;

  return (
    <div className="space-y-6">
      {/* Toolbar : plage de dates + nouvelle écriture */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <form onSubmit={applyRange} className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
          <Field label="Du" className="sm:w-44">
            <Input
              type="date"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
            />
          </Field>
          <Field label="Au" className="sm:w-44">
            <Input
              type="date"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
            />
          </Field>
          <div className="col-span-2 sm:col-span-1">
            <Button type="submit" variant="outline" className="w-full sm:w-auto">
              <Filter className="h-4 w-4" /> Appliquer
            </Button>
          </div>
        </form>

        <Button onClick={() => setEntryOpen(true)}>
          <Plus className="h-4 w-4" /> Nouvelle écriture
        </Button>
      </div>

      {/* Barre d'onglets */}
      <div className="thin-scroll -mb-px flex gap-1 overflow-x-auto border-b border-steel-100">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "border-cobalt-500 text-cobalt-700"
                  : "border-transparent text-steel-500 hover:text-steel-800",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Contenu */}
      {tab === "resultat" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat
              label="Produits"
              value={formatMoney(produits)}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="green"
            />
            <Stat
              label="Charges"
              value={formatMoney(charges)}
              icon={<TrendingDown className="h-5 w-5" />}
              tone="red"
            />
          </div>

          <Card className="flex items-center justify-between gap-4 p-6">
            <div className="min-w-0">
              <p className="text-sm font-medium text-steel-500">
                Résultat de la période
              </p>
              <p
                className={cn(
                  "mt-1 font-display text-3xl font-bold tabular-nums",
                  resultat >= 0 ? "text-emerald-600" : "text-red-600",
                )}
              >
                {formatMoney(resultat)}
              </p>
              <p className="mt-1 text-xs text-steel-400">
                {resultat >= 0 ? "Bénéfice" : "Perte"} · du {formatDate(from)} au{" "}
                {formatDate(to)}
              </p>
            </div>
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                resultat >= 0
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-600",
              )}
            >
              {resultat >= 0 ? (
                <TrendingUp className="h-6 w-6" />
              ) : (
                <TrendingDown className="h-6 w-6" />
              )}
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <ResultSection title="Produits" lines={incomeLines} total={produits} />
            <ResultSection title="Charges" lines={expenseLines} total={charges} />
          </div>
        </div>
      )}

      {tab === "bilan" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <BalanceSection title="Actif" rows={assetRows} total={totalActif} />
          <BalanceSection title="Passif" rows={passifRows} total={totalPassif} />
        </div>
      )}

      {tab === "balance" && (
        <>
          {trial.length > 0 ? (
            <Table>
              <THead>
                <TR>
                  <TH className="w-24">Code</TH>
                  <TH>Compte</TH>
                  <TH className="text-right">Débit</TH>
                  <TH className="text-right">Crédit</TH>
                </TR>
              </THead>
              <TBody>
                {trial.map((r) => (
                  <TR key={r.code}>
                    <TD className="font-mono text-xs text-steel-400">{r.code}</TD>
                    <TD className="font-medium text-steel-900">{r.name}</TD>
                    <TD className="text-right tabular-nums">
                      {formatMoney(r.total_debit)}
                    </TD>
                    <TD className="text-right tabular-nums">
                      {formatMoney(r.total_credit)}
                    </TD>
                  </TR>
                ))}
                <TR className="bg-steel-50/70 hover:bg-steel-50/70">
                  <TD />
                  <TD className="font-semibold text-steel-900">Total</TD>
                  <TD className="text-right font-semibold tabular-nums text-steel-900">
                    {formatMoney(
                      trial.reduce((s, r) => s + Number(r.total_debit), 0),
                    )}
                  </TD>
                  <TD className="text-right font-semibold tabular-nums text-steel-900">
                    {formatMoney(
                      trial.reduce((s, r) => s + Number(r.total_credit), 0),
                    )}
                  </TD>
                </TR>
              </TBody>
            </Table>
          ) : (
            <EmptyState
              icon={<Layers className="h-6 w-6" />}
              title="Balance vide"
              description="Aucun mouvement sur la période sélectionnée."
            />
          )}
        </>
      )}

      {tab === "journal" && (
        <>
          {journal.length > 0 ? (
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Libellé</TH>
                  <TH>Débit</TH>
                  <TH>Crédit</TH>
                  <TH className="text-right">Montant</TH>
                  <TH>Sens</TH>
                </TR>
              </THead>
              <TBody>
                {journal.map((j) => {
                  const d = DIRECTION[j.direction];
                  return (
                    <TR key={j.entry_id}>
                      <TD className="whitespace-nowrap text-steel-500">
                        {formatDateTime(j.occurred_at)}
                      </TD>
                      <TD>
                        <span className="font-medium text-steel-900">
                          {j.label}
                        </span>
                        {j.memo && (
                          <span className="mt-0.5 block max-w-xs truncate text-xs text-steel-400">
                            {j.memo}
                          </span>
                        )}
                      </TD>
                      <TD className="text-steel-600">{j.debit_names || "—"}</TD>
                      <TD className="text-steel-600">{j.credit_names || "—"}</TD>
                      <TD className="text-right tabular-nums font-semibold text-steel-900">
                        {formatMoney(j.amount)}
                      </TD>
                      <TD>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={d.tone}>{d.label}</Badge>
                          {(j.reversed || j.is_reversal) && (
                            <Badge tone="amber">
                              <RotateCcw className="h-3 w-3" /> Retour
                            </Badge>
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
              icon={<BookOpen className="h-6 w-6" />}
              title="Grand livre vide"
              description="Aucune écriture sur la période sélectionnée."
            />
          )}
        </>
      )}

      {tab === "plan" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-base font-bold text-steel-900">
              Plan comptable
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAccForm(EMPTY_ACCOUNT);
                setAccountOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Nouveau compte
            </Button>
          </div>

          {chart.length > 0 ? (
            <Table>
              <THead>
                <TR>
                  <TH className="w-24">Code</TH>
                  <TH>Compte</TH>
                  <TH>Type</TH>
                  <TH className="text-right">Solde</TH>
                  <TH className="text-center">Écritures</TH>
                </TR>
              </THead>
              <TBody>
                {chart.map((a) => (
                  <TR key={a.account_id}>
                    <TD className="font-mono text-xs text-steel-400">{a.code}</TD>
                    <TD>
                      <span className="font-medium text-steel-900">{a.name}</span>
                      {a.description && (
                        <span className="mt-0.5 block max-w-xs truncate text-xs text-steel-400">
                          {a.description}
                        </span>
                      )}
                    </TD>
                    <TD>
                      <Badge tone="neutral">{ACCOUNT_TYPE_LABELS[a.type]}</Badge>
                    </TD>
                    <TD className="text-right tabular-nums font-medium text-steel-900">
                      {formatMoney(a.balance)}
                    </TD>
                    <TD className="text-center tabular-nums text-steel-500">
                      {formatNumber(Number(a.entry_count))}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <EmptyState
              icon={<ListTree className="h-6 w-6" />}
              title="Aucun compte"
              description="Créez votre premier compte pour construire le plan comptable."
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setAccForm(EMPTY_ACCOUNT);
                    setAccountOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" /> Nouveau compte
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* Modale : nouvelle écriture */}
      <Modal
        open={entryOpen}
        onClose={() => setEntryOpen(false)}
        title="Nouvelle écriture"
        description="Enregistrez une dépense, une recette ou un transfert."
      >
        <EntryForm onSuccess={() => setEntryOpen(false)} />
      </Modal>

      {/* Modale : nouveau compte */}
      <Modal
        open={accountOpen}
        onClose={closeAccount}
        title="Nouveau compte"
        description="Ajoutez un compte au plan comptable."
        footer={
          <>
            <Button
              variant="outline"
              onClick={closeAccount}
              disabled={savingAccount}
            >
              Annuler
            </Button>
            <Button
              onClick={submitAccount}
              loading={savingAccount}
              disabled={!accForm.name.trim()}
            >
              Créer le compte
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nom du compte" required>
            <Input
              value={accForm.name}
              onChange={(e) =>
                setAccForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="Ex. Électricité"
            />
          </Field>

          <Field label="Type" required>
            <Select
              value={accForm.type}
              onChange={(e) =>
                setAccForm((f) => ({
                  ...f,
                  type: e.target.value as AccountType,
                }))
              }
            >
              {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((t) => (
                <option key={t} value={t}>
                  {ACCOUNT_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Code"
            hint="Laissez vide pour attribuer automatiquement le prochain code."
          >
            <Input
              value={accForm.code}
              onChange={(e) =>
                setAccForm((f) => ({ ...f, code: e.target.value }))
              }
              placeholder="Ex. 5050"
            />
          </Field>

          <Field label="Description">
            <Textarea
              value={accForm.description}
              onChange={(e) =>
                setAccForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Note sur l'usage de ce compte (facultatif)."
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function ResultSection({
  title,
  lines,
  total,
}: {
  title: string;
  lines: IncomeStatementRow[];
  total: number;
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-display text-base font-bold text-steel-900">{title}</h3>
      {lines.length > 0 ? (
        <Table>
          <THead>
            <TR>
              <TH>Compte</TH>
              <TH className="text-right">Montant</TH>
            </TR>
          </THead>
          <TBody>
            {lines.map((l) => (
              <TR key={l.code}>
                <TD>
                  <span className="font-mono text-xs text-steel-400">
                    {l.code}
                  </span>{" "}
                  <span className="text-steel-800">{l.name}</span>
                </TD>
                <TD className="text-right tabular-nums text-steel-900">
                  {formatMoney(l.amount)}
                </TD>
              </TR>
            ))}
            <TR className="bg-steel-50/70 hover:bg-steel-50/70">
              <TD className="font-semibold text-steel-900">Total {title}</TD>
              <TD className="text-right font-semibold tabular-nums text-steel-900">
                {formatMoney(total)}
              </TD>
            </TR>
          </TBody>
        </Table>
      ) : (
        <EmptyState
          className="py-10"
          title={`Aucune ligne`}
          description={`Aucun mouvement de type « ${title.toLowerCase()} » sur la période.`}
        />
      )}
    </div>
  );
}

function BalanceSection({
  title,
  rows,
  total,
}: {
  title: string;
  rows: BalanceRow[];
  total: number;
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-display text-base font-bold text-steel-900">{title}</h3>
      {rows.length > 0 ? (
        <Table>
          <THead>
            <TR>
              <TH>Compte</TH>
              <TH className="text-right">Montant</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={`${r.section}-${r.code}`}>
                <TD>
                  <span className="font-mono text-xs text-steel-400">
                    {r.code}
                  </span>{" "}
                  <span className="text-steel-800">{r.name}</span>
                </TD>
                <TD className="text-right tabular-nums text-steel-900">
                  {formatMoney(r.amount)}
                </TD>
              </TR>
            ))}
            <TR className="bg-steel-50/70 hover:bg-steel-50/70">
              <TD className="font-semibold text-steel-900">Total {title.toLowerCase()}</TD>
              <TD className="text-right font-semibold tabular-nums text-steel-900">
                {formatMoney(total)}
              </TD>
            </TR>
          </TBody>
        </Table>
      ) : (
        <EmptyState
          className="py-10"
          title="Aucune ligne"
          description={`Aucun solde ${title.toLowerCase()} à afficher.`}
        />
      )}
    </div>
  );
}
