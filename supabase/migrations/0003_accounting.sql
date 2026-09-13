-- ============================================================================
-- 0003_accounting.sql — real double-entry accounting, the dbms way.
--
-- Every franc that moves — a sale, a purchase, an expense, a transfer between
-- the till and the bank — becomes a balanced journal entry (debits = credits).
-- Rows are never edited or deleted; a mistake is undone by a reversing entry,
-- so the audit trail is free.
--
-- `post_ledger_entry()` is the engine. It makes no permission check because it
-- is internal and never granted: it is called only by functions that have
-- already established the caller may post (record_sale checks is_staff,
-- record_purchase / record_entry check is_admin). Everything a person can call
-- directly re-derives the same check the RLS policy would have made.
--
-- All reading of the books is admin-only — employees run the shop, they do not
-- see the money.
-- ============================================================================

create table if not exists accounts (
    id          uuid primary key default gen_random_uuid(),
    code        text not null unique,
    name        text not null,
    type        text not null
                check (type in ('asset','liability','equity','income','expense')),
    description text,
    is_active   boolean not null default true,
    created_at  timestamptz not null default now(),
    created_by  uuid references staff(id)
);

create index if not exists accounts_by_type_name
    on accounts (type, lower(btrim(name)));

create table if not exists journal_entries (
    id                uuid primary key default gen_random_uuid(),
    label             text not null,
    memo              text,
    details           jsonb not null default '{}'::jsonb,
    occurred_at       timestamptz not null default now(),
    reverses_entry_id uuid references journal_entries(id),
    created_by        uuid references staff(id),
    created_at        timestamptz not null default now()
);

create index if not exists journal_entries_by_date
    on journal_entries (created_at desc);

create table if not exists journal_lines (
    id               uuid primary key default gen_random_uuid(),
    journal_entry_id uuid not null references journal_entries(id) on delete cascade,
    account_id       uuid not null references accounts(id),
    debit            numeric(14,2) not null default 0 check (debit >= 0),
    credit           numeric(14,2) not null default 0 check (credit >= 0)
);

create index if not exists journal_lines_by_entry on journal_lines (journal_entry_id);
create index if not exists journal_lines_by_account on journal_lines (account_id);

-- ── Minting accounts ────────────────────────────────────────────────────────

create or replace function account_code_band(p_type text)
returns int language sql immutable as $$
    select case p_type
        when 'asset' then 1000 when 'liability' then 2000
        when 'equity' then 3000 when 'income' then 4000
        when 'expense' then 5000 end;
$$;

create or replace function next_account_code(p_type text)
returns text language plpgsql stable as $$
declare
    v_band int := account_code_band(p_type);
    v_next int;
begin
    if v_band is null then
        raise exception 'Type de compte inconnu : %', p_type;
    end if;
    select coalesce(max(a.code::int), v_band - 10) + 10 into v_next
      from accounts a
     where a.code ~ '^[0-9]+$' and a.code::int between v_band and v_band + 999;
    if v_next > v_band + 999 then
        raise exception 'Plus de code % disponible', p_type;
    end if;
    return v_next::text;
end;
$$;

-- Internal: find an account by name, create it if absent. Not granted.
create or replace function ensure_account(
    p_name text, p_type text, p_actor uuid default null
)
returns uuid language plpgsql as $$
declare
    v_name text := btrim(coalesce(p_name, ''));
    v_id   uuid;
begin
    if v_name = '' then raise exception 'Un compte a besoin d''un nom'; end if;
    if account_code_band(p_type) is null then
        raise exception 'Type de compte inconnu : %', p_type;
    end if;
    select a.id into v_id from accounts a
     where a.type = p_type and lower(btrim(a.name)) = lower(v_name)
     order by a.created_at, a.code limit 1;
    if v_id is not null then return v_id; end if;
    insert into accounts (code, name, type, created_by)
    values (next_account_code(p_type), v_name, p_type, p_actor)
    returning id into v_id;
    return v_id;
end;
$$;

create or replace function ensure_account_by_code(
    p_code text, p_name text, p_type text, p_actor uuid default null
)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
    select id into v_id from accounts where code = p_code;
    if v_id is not null then return v_id; end if;
    insert into accounts (code, name, type, created_by)
    values (p_code, p_name, p_type, p_actor) returning id into v_id;
    return v_id;
end;
$$;

create or replace function resolve_cash_account(p_method text, p_actor uuid default null)
returns uuid language plpgsql as $$
begin
    return case btrim(lower(coalesce(p_method, 'cash')))
        when 'cash'         then ensure_account_by_code('1000', 'Caisse', 'asset', p_actor)
        when 'bank'         then ensure_account_by_code('1010', 'Banque', 'asset', p_actor)
        when 'mobile_money' then ensure_account_by_code('1020', 'Mobile Money', 'asset', p_actor)
        else ensure_account(p_method, 'asset', p_actor)
    end;
end;
$$;

-- ── The posting engine (internal, no permission check) ──────────────────────
create or replace function post_ledger_entry(
    p_amount      numeric,
    p_direction   text,                       -- 'in' | 'out'
    p_label       text,
    p_actor       uuid,
    p_category    text        default null,   -- income/expense account name
    p_method      text        default 'cash',
    p_memo        text        default null,
    p_details     jsonb       default '{}'::jsonb,
    p_occurred_at timestamptz default now()
)
returns uuid language plpgsql
security definer set search_path = public, auth
as $$
declare
    v_label       text := btrim(coalesce(p_label, ''));
    v_category    text;
    v_entry_id    uuid;
    v_cash_acct   uuid;
    v_result_acct uuid;
begin
    if p_amount is null or p_amount <= 0 then
        raise exception 'Le montant doit être supérieur à zéro (%)' , p_amount;
    end if;
    if p_direction not in ('in','out') then
        raise exception 'Direction invalide : %', p_direction;
    end if;
    if v_label = '' then raise exception 'Une écriture a besoin d''un libellé'; end if;

    v_category := coalesce(nullif(btrim(coalesce(p_category, '')), ''), v_label);
    v_cash_acct := resolve_cash_account(p_method, p_actor);
    v_result_acct := ensure_account(
        v_category,
        case p_direction when 'in' then 'income' else 'expense' end,
        p_actor);

    insert into journal_entries (label, memo, details, created_by, occurred_at, created_at)
    values (v_label, p_memo, coalesce(p_details, '{}'::jsonb), p_actor,
            p_occurred_at, p_occurred_at)
    returning id into v_entry_id;

    if p_direction = 'in' then
        insert into journal_lines (journal_entry_id, account_id, debit, credit) values
            (v_entry_id, v_cash_acct,   p_amount, 0),
            (v_entry_id, v_result_acct, 0,        p_amount);
    else
        insert into journal_lines (journal_entry_id, account_id, debit, credit) values
            (v_entry_id, v_result_acct, p_amount, 0),
            (v_entry_id, v_cash_acct,   0,        p_amount);
    end if;

    return v_entry_id;
end;
$$;

-- ── Manual entries from the accounting screen (admin only) ───────────────────
create or replace function record_entry(
    p_amount      numeric,
    p_direction   text,
    p_label       text,
    p_category    text        default null,
    p_method      text        default 'cash',
    p_memo        text        default null,
    p_details     jsonb       default '{}'::jsonb,
    p_occurred_at timestamptz default now()
)
returns uuid language plpgsql
security definer set search_path = public, auth
as $$
declare v_actor uuid := auth.uid();
begin
    if not is_admin() then
        raise exception 'Réservé à l''administrateur';
    end if;
    return post_ledger_entry(p_amount, p_direction, p_label, v_actor,
        p_category, p_method, p_memo, p_details, p_occurred_at);
end;
$$;

create or replace function record_transfer(
    p_amount      numeric,
    p_from_method text,
    p_to_method   text,
    p_label       text        default null,
    p_memo        text        default null,
    p_occurred_at timestamptz default now()
)
returns uuid language plpgsql
security definer set search_path = public, auth
as $$
declare
    v_actor uuid := auth.uid();
    v_from  uuid;
    v_to    uuid;
    v_entry uuid;
begin
    if not is_admin() then raise exception 'Réservé à l''administrateur'; end if;
    if p_amount is null or p_amount <= 0 then
        raise exception 'Le montant doit être supérieur à zéro';
    end if;
    v_from := resolve_cash_account(p_from_method, v_actor);
    v_to   := resolve_cash_account(p_to_method, v_actor);
    if v_from = v_to then raise exception 'Un transfert a besoin de deux comptes différents'; end if;

    insert into journal_entries (label, memo, created_by, occurred_at, created_at)
    values (coalesce(nullif(btrim(coalesce(p_label,'')), ''), 'Transfert'),
            p_memo, v_actor, p_occurred_at, p_occurred_at)
    returning id into v_entry;

    insert into journal_lines (journal_entry_id, account_id, debit, credit) values
        (v_entry, v_to,   p_amount, 0),
        (v_entry, v_from, 0,        p_amount);
    return v_entry;
end;
$$;

create or replace function create_account(
    p_name text, p_type text, p_description text default null, p_code text default null
)
returns uuid language plpgsql
security definer set search_path = public, auth
as $$
declare v_name text := btrim(coalesce(p_name, '')); v_id uuid;
begin
    if not is_admin() then raise exception 'Réservé à l''administrateur'; end if;
    if v_name = '' then raise exception 'Un compte a besoin d''un nom'; end if;
    if account_code_band(p_type) is null then raise exception 'Type inconnu : %', p_type; end if;
    if exists (select 1 from accounts a where a.type = p_type
               and lower(btrim(a.name)) = lower(v_name)) then
        raise exception 'Un compte « % » existe déjà', v_name;
    end if;
    insert into accounts (code, name, type, description, created_by)
    values (coalesce(nullif(btrim(coalesce(p_code,'')), ''), next_account_code(p_type)),
            v_name, p_type, nullif(btrim(coalesce(p_description,'')), ''), auth.uid())
    returning id into v_id;
    return v_id;
end;
$$;

-- ── Reports (admin only) ─────────────────────────────────────────────────────
create or replace function chart_of_accounts()
returns table (account_id uuid, code text, name text, type text,
               description text, is_active boolean, balance numeric, entry_count bigint)
language sql stable security definer set search_path = public, auth as $$
    select a.id, a.code, a.name, a.type, a.description, a.is_active,
        coalesce(sum(case when a.type in ('asset','expense')
                          then jl.debit - jl.credit else jl.credit - jl.debit end), 0),
        count(jl.id)
    from accounts a
    left join journal_lines jl on jl.account_id = a.id
    where is_admin()
    group by a.id, a.code, a.name, a.type, a.description, a.is_active
    order by a.code;
$$;

create or replace function trial_balance(p_from date default null, p_to date default null)
returns table (code text, name text, type text,
               total_debit numeric, total_credit numeric, balance numeric)
language sql stable security definer set search_path = public, auth as $$
    select a.code, a.name, a.type,
        coalesce(sum(jl.debit), 0), coalesce(sum(jl.credit), 0),
        coalesce(sum(jl.debit - jl.credit), 0)
    from accounts a
    left join journal_lines jl on jl.account_id = a.id
    left join journal_entries je on je.id = jl.journal_entry_id
        and (p_from is null or je.occurred_at::date >= p_from)
        and (p_to   is null or je.occurred_at::date <= p_to)
    where is_admin() and (jl.id is null or je.id is not null)
    group by a.code, a.name, a.type
    order by a.code;
$$;

create or replace function income_statement(p_from date default null, p_to date default null)
returns table (section text, code text, name text, amount numeric)
language sql stable security definer set search_path = public, auth as $$
    with lines as (
        select a.type, a.code, a.name, jl.debit, jl.credit
        from journal_entries je
        join journal_lines jl on jl.journal_entry_id = je.id
        join accounts a on a.id = jl.account_id
        where is_admin() and a.type in ('income','expense')
          and (p_from is null or je.occurred_at::date >= p_from)
          and (p_to   is null or je.occurred_at::date <= p_to)
    )
    select 'income'::text, code, name, sum(credit - debit) from lines
        where type = 'income' group by code, name having sum(credit - debit) <> 0
    union all
    select 'expense'::text, code, name, sum(debit - credit) from lines
        where type = 'expense' group by code, name having sum(debit - credit) <> 0
    union all
    select 'total'::text, '1', 'Produits',
        coalesce(sum(credit - debit) filter (where type = 'income'), 0) from lines
    union all
    select 'total'::text, '2', 'Charges',
        coalesce(sum(debit - credit) filter (where type = 'expense'), 0) from lines
    union all
    select 'total'::text, '3', 'Résultat',
        coalesce(sum(credit - debit) filter (where type = 'income'), 0)
      - coalesce(sum(debit - credit) filter (where type = 'expense'), 0) from lines
    order by 1, 2;
$$;

create or replace function balance_sheet(p_as_of date default null)
returns table (section text, code text, name text, amount numeric)
language sql stable security definer set search_path = public, auth as $$
    with lines as (
        select a.type, a.code, a.name, jl.debit, jl.credit
        from journal_entries je
        join journal_lines jl on jl.journal_entry_id = je.id
        join accounts a on a.id = jl.account_id
        where is_admin() and (p_as_of is null or je.occurred_at::date <= p_as_of)
    ),
    result as (
        select coalesce(sum(credit - debit) filter (where type = 'income'), 0)
             - coalesce(sum(debit - credit) filter (where type = 'expense'), 0) as amount
        from lines
    )
    select 'asset'::text, code, name, sum(debit - credit) from lines
        where type = 'asset' group by code, name having sum(debit - credit) <> 0
    union all
    select 'liability'::text, code, name, sum(credit - debit) from lines
        where type = 'liability' group by code, name having sum(credit - debit) <> 0
    union all
    select 'equity'::text, code, name, sum(credit - debit) from lines
        where type = 'equity' group by code, name having sum(credit - debit) <> 0
    union all
    select 'equity'::text, 'zzz', 'Résultat accumulé', r.amount
        from result r where r.amount <> 0
    union all
    select 'total'::text, '1', 'Total actif',
        coalesce(sum(debit - credit) filter (where type = 'asset'), 0) from lines
    union all
    select 'total'::text, '2', 'Total passif',
        coalesce(sum(credit - debit) filter (where type in ('liability','equity')), 0)
      + (select amount from result) from lines
    order by 1, 2;
$$;

create or replace function journal_page(
    p_from date default null, p_to date default null,
    p_limit int default 100, p_offset int default 0
)
returns table (entry_id uuid, occurred_at timestamptz, label text, memo text,
               details jsonb, amount numeric, debit_names text, credit_names text,
               direction text, reversed boolean, is_reversal boolean, recorded_by text)
language sql stable security definer set search_path = public, auth as $$
    select je.id, je.occurred_at, coalesce(je.label, je.memo, 'Écriture'), je.memo, je.details,
        coalesce(sum(jl.debit), 0),
        string_agg(distinct a.name, ', ') filter (where jl.debit > 0),
        string_agg(distinct a.name, ', ') filter (where jl.credit > 0),
        case when bool_or(a.type = 'income'  and jl.credit > 0) then 'in'
             when bool_or(a.type = 'expense' and jl.debit  > 0) then 'out'
             else 'transfer' end,
        exists (select 1 from journal_entries r where r.reverses_entry_id = je.id),
        je.reverses_entry_id is not null,
        coalesce(s.full_name, 'Inconnu')
    from journal_entries je
    join journal_lines jl on jl.journal_entry_id = je.id
    join accounts a on a.id = jl.account_id
    left join staff s on s.id = je.created_by
    where is_admin()
      and (p_from is null or je.occurred_at::date >= p_from)
      and (p_to   is null or je.occurred_at::date <= p_to)
    group by je.id, je.occurred_at, je.label, je.memo, je.details,
             je.reverses_entry_id, s.full_name
    order by je.occurred_at desc, je.id desc
    limit greatest(coalesce(p_limit, 100), 1) offset greatest(coalesce(p_offset, 0), 0);
$$;

-- ── Seed the chart of accounts (idempotent) ─────────────────────────────────
create or replace function seed_chart_of_accounts()
returns void language plpgsql as $$
begin
    insert into accounts (code, name, type) values
        ('1000', 'Caisse',                 'asset'),
        ('1010', 'Banque',                 'asset'),
        ('1020', 'Mobile Money',           'asset'),
        ('1200', 'Clients',                'asset'),
        ('1300', 'Stock de marchandises',  'asset'),
        ('4000', 'Ventes',                 'income'),
        ('5000', 'Achats de marchandises', 'expense'),
        ('5010', 'Loyer',                  'expense'),
        ('5020', 'Transport',              'expense'),
        ('5030', 'Salaires',               'expense'),
        ('5040', 'Charges diverses',       'expense')
    on conflict (code) do nothing;
end;
$$;

-- ── RLS: the books are admin-only ────────────────────────────────────────────
alter table accounts        enable row level security;
alter table journal_entries enable row level security;
alter table journal_lines   enable row level security;

drop policy if exists "accounts admin read" on accounts;
create policy "accounts admin read" on accounts for select using (is_admin());
drop policy if exists "accounts admin insert" on accounts;
create policy "accounts admin insert" on accounts for insert with check (is_admin());
drop policy if exists "accounts admin update" on accounts;
create policy "accounts admin update" on accounts for update using (is_admin()) with check (is_admin());

drop policy if exists "journal admin read" on journal_entries;
create policy "journal admin read" on journal_entries for select using (is_admin());
drop policy if exists "journal lines admin read" on journal_lines;
create policy "journal lines admin read" on journal_lines for select using (is_admin());
-- No insert/update/delete policy on the ledger: writes go through the definer
-- functions only, and a wrong entry is corrected by a reversal, never edited.

-- ── Grants ───────────────────────────────────────────────────────────────────
revoke execute on function post_ledger_entry(numeric, text, text, uuid, text, text, text, jsonb, timestamptz) from public;
revoke execute on function ensure_account(text, text, uuid) from public;
revoke execute on function ensure_account_by_code(text, text, text, uuid) from public;
revoke execute on function resolve_cash_account(text, uuid) from public;
revoke execute on function record_entry(numeric, text, text, text, text, text, jsonb, timestamptz) from public;
revoke execute on function record_transfer(numeric, text, text, text, text, timestamptz) from public;
revoke execute on function create_account(text, text, text, text) from public;
revoke execute on function chart_of_accounts() from public;
revoke execute on function trial_balance(date, date) from public;
revoke execute on function income_statement(date, date) from public;
revoke execute on function balance_sheet(date) from public;
revoke execute on function journal_page(date, date, int, int) from public;

do $$
begin
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
        grant execute on function record_entry(numeric, text, text, text, text, text, jsonb, timestamptz) to authenticated;
        grant execute on function record_transfer(numeric, text, text, text, text, timestamptz) to authenticated;
        grant execute on function create_account(text, text, text, text) to authenticated;
        grant execute on function chart_of_accounts() to authenticated;
        grant execute on function trial_balance(date, date) to authenticated;
        grant execute on function income_statement(date, date) to authenticated;
        grant execute on function balance_sheet(date) to authenticated;
        grant execute on function journal_page(date, date, int, int) to authenticated;
    end if;
end $$;
