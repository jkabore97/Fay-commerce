import { PageHeader } from "@/components/ui/primitives";
import { AccountingTabs } from "@/components/admin/accounting/accounting-tabs";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ComptabilitePage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  await requireAdmin();
  const supabase = createClient();

  const now = new Date();
  const to = searchParams.to || now.toISOString().slice(0, 10);
  const from = searchParams.from || `${now.getFullYear()}-01-01`;

  const [incomeRes, balanceRes, trialRes, chartRes, journalRes] =
    await Promise.all([
      supabase.rpc("income_statement", { p_from: from, p_to: to }),
      supabase.rpc("balance_sheet", { p_as_of: to }),
      supabase.rpc("trial_balance", { p_from: from, p_to: to }),
      supabase.rpc("chart_of_accounts"),
      supabase.rpc("journal_page", { p_from: from, p_to: to, p_limit: 100 }),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comptabilité"
        description="Les livres de Fay & Partenaires : résultat, bilan, balance, grand livre et plan comptable."
      />
      <AccountingTabs
        income={incomeRes.data ?? []}
        balance={balanceRes.data ?? []}
        trial={trialRes.data ?? []}
        chart={chartRes.data ?? []}
        journal={journalRes.data ?? []}
        from={from}
        to={to}
      />
    </div>
  );
}
