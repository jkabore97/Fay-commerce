-- ============================================================================
-- apply_all.sql — Fay & Partenaires : schéma complet de la base de données.
--
-- GÉNÉRÉ automatiquement par scripts/build-bundle.mjs — NE PAS ÉDITER À LA MAIN.
-- Collez ce fichier dans l'éditeur SQL de Supabase et exécutez-le une fois.
-- Toutes les migrations sont ré-exécutables (create ... if not exists / or replace,
-- drop policy if exists, on conflict do nothing).
--
-- Migrations incluses : 0001_core.sql, 0002_catalog.sql, 0003_accounting.sql, 0004_purchases_sales.sql, 0005_quotes.sql, 0006_cms.sql, 0007_seed.sql, 0008_storage.sql
-- ============================================================================


-- ===== 0001_core.sql =====================================================

-- ============================================================================
-- 0001_core.sql — identity, roles, and the helpers every policy leans on.
--
-- Fay & Partenaires is a single business, so there is no tenant column anywhere
-- in this schema. Access is decided by one thing: does the signed-in user have
-- an active row in `staff`, and is its role `admin` or `employee`.
--
--   admin     — owns the money and the site: accounting, purchases, prices,
--               the chart of accounts, the CMS (content, promos, partners),
--               and the team. Can do everything an employee can.
--   employee  — runs the shop floor: the catalogue, stock counts, sales, and
--               quote requests (devis). Never sees the books.
--
-- The two helper functions below are the load-bearing pieces. They are
-- SECURITY DEFINER so a policy on any table can call them without that table's
-- RLS recursing back into `staff`, and they answer only about the *current*
-- caller, so there is nothing they can leak.
-- ============================================================================

create extension if not exists pgcrypto;

-- A generic updated_at stamp, reused by every table that has the column.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Staff — the only table that grants any access at all.
-- The id IS the auth.users id: a staff row is an auth account promoted to a
-- role. Filling in an auth account grants nothing; this row does.
-- ----------------------------------------------------------------------------
create table if not exists staff (
    id         uuid primary key references auth.users(id) on delete cascade,
    full_name  text not null,
    role       text not null default 'employee'
               check (role in ('admin', 'employee')),
    phone      text,
    is_active  boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

drop trigger if exists staff_updated_at on staff;
create trigger staff_updated_at before update on staff
    for each row execute function set_updated_at();

-- Is the caller an active staff member of any role?
create or replace function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
    select exists (
        select 1 from staff s
        where s.id = auth.uid() and s.is_active
    );
$$;

-- Is the caller an active administrator?
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
    select exists (
        select 1 from staff s
        where s.id = auth.uid() and s.is_active and s.role = 'admin'
    );
$$;

-- ----------------------------------------------------------------------------
-- Row level security on staff itself.
-- A user may read their own row (that is how the app learns its role); an admin
-- may read and manage everyone. Nobody may change their own role — only an
-- admin writes to this table, and the app's "team" screen is admin-only.
-- ----------------------------------------------------------------------------
alter table staff enable row level security;

drop policy if exists "staff self or admin read" on staff;
create policy "staff self or admin read"
on staff for select
using (id = auth.uid() or is_admin());

drop policy if exists "staff admin insert" on staff;
create policy "staff admin insert"
on staff for insert with check (is_admin());

drop policy if exists "staff admin update" on staff;
create policy "staff admin update"
on staff for update using (is_admin()) with check (is_admin());

drop policy if exists "staff admin delete" on staff;
create policy "staff admin delete"
on staff for delete using (is_admin());

-- ----------------------------------------------------------------------------
-- Grants. The helpers must be callable by both anon and authenticated because
-- policies on public-facing tables (banners, partners) reference is_staff().
-- ----------------------------------------------------------------------------
revoke execute on function is_staff() from public;
revoke execute on function is_admin() from public;

do $$
begin
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
        grant execute on function is_staff() to authenticated;
        grant execute on function is_admin() to authenticated;
    end if;
    if exists (select 1 from pg_roles where rolname = 'anon') then
        grant execute on function is_staff() to anon;
        grant execute on function is_admin() to anon;
    end if;
end $$;

comment on table staff is
    'An auth account promoted to admin or employee. The only source of access.';

-- ===== 0002_catalog.sql ==================================================

-- ============================================================================
-- 0002_catalog.sql — categories, products, and stock.
--
-- Two rules from the dbms retail module carry straight over:
--   * Stock is a column (`products.quantity`), written by the functions below,
--     so "how many do I have" is one read, not a sum over history.
--   * Every change to that column also writes an append-only `stock_movements`
--     row, so the count can be rebuilt and the history is never lost.
--
-- The rule that is specific to Fay: the storefront never sees a price. The
-- `products` table is not readable by `anon` at all. The public catalogue is
-- served by the `storefront_*` functions, which return a projection with the
-- prices and the exact count removed — availability is a boolean, nothing more.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Categories — the six fastener families (and any the admin adds).
-- ----------------------------------------------------------------------------
create table if not exists categories (
    id          uuid primary key default gen_random_uuid(),
    slug        text not null unique,
    name        text not null,
    description text,
    image_url   text,
    sort_order  int not null default 0,
    is_active   boolean not null default true,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

drop trigger if exists categories_updated_at on categories;
create trigger categories_updated_at before update on categories
    for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Products. Prices live here and never leave the staff side.
-- ----------------------------------------------------------------------------
create table if not exists products (
    id           uuid primary key default gen_random_uuid(),
    slug         text not null unique,
    sku          text,
    name         text not null,
    category_id  uuid references categories(id) on delete set null,
    description  text,
    material     text,
    -- Free-form technical characteristics (diamètre, longueur, grade, finition…)
    specs        jsonb not null default '{}'::jsonb,
    -- The business sells by the lot, not the piece — the unit says which.
    unit         text not null default 'lot',
    pack_size    text,
    image_url    text,
    gallery      jsonb not null default '[]'::jsonb,
    cost_price   numeric(14,2) not null default 0 check (cost_price >= 0),
    sale_price   numeric(14,2) not null default 0 check (sale_price >= 0),
    quantity     numeric(14,3) not null default 0,
    low_stock_at numeric(14,3),
    is_active    boolean not null default true,
    is_featured  boolean not null default false,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    created_by   uuid references staff(id)
);

create index if not exists products_by_category on products (category_id);
create index if not exists products_active on products (id) where is_active;
create index if not exists products_featured
    on products (id) where is_active and is_featured;
create unique index if not exists products_by_name
    on products (lower(btrim(name)));
-- Full-text-ish search over name / sku / material for the catalogue search box.
create index if not exists products_search
    on products using gin (
        to_tsvector('simple',
            coalesce(name,'') || ' ' || coalesce(sku,'') || ' ' ||
            coalesce(material,'') || ' ' || coalesce(description,''))
    );

drop trigger if exists products_updated_at on products;
create trigger products_updated_at before update on products
    for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Stock movements — append-only history behind the quantity column.
-- ----------------------------------------------------------------------------
create table if not exists stock_movements (
    id         uuid primary key default gen_random_uuid(),
    product_id uuid not null references products(id) on delete cascade,
    kind       text not null
               check (kind in ('receipt','adjustment','sale','return','opening')),
    quantity   numeric(14,3) not null,   -- signed: +in / -out
    unit_cost  numeric(14,2),
    note       text,
    ref_id     uuid,                     -- the sale/purchase that caused it
    created_by uuid references staff(id),
    created_at timestamptz not null default now()
);

create index if not exists stock_movements_by_product
    on stock_movements (product_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Putting a product on the shelf. Finds by name, creates once. Internal helper:
-- not granted to anyone, called from the definer functions that already checked
-- the caller is staff.
-- ----------------------------------------------------------------------------
create or replace function ensure_product(
    p_name       text,
    p_sale_price numeric default null,
    p_cost_price numeric default null,
    p_actor      uuid    default null
)
returns uuid
language plpgsql
as $$
declare
    v_name text := btrim(coalesce(p_name, ''));
    v_slug text;
    v_id   uuid;
begin
    if v_name = '' then
        raise exception 'Un produit a besoin d''un nom';
    end if;

    select id into v_id from products where lower(btrim(name)) = lower(v_name);
    if v_id is not null then
        return v_id;
    end if;

    -- Slug from the name, made unique by a short suffix if it collides.
    v_slug := regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g');
    v_slug := btrim(v_slug, '-');
    if v_slug = '' then v_slug := 'produit'; end if;
    if exists (select 1 from products where slug = v_slug) then
        v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 6);
    end if;

    insert into products (slug, name, sale_price, cost_price, created_by)
    values (v_slug, v_name,
            coalesce(p_sale_price, 0), coalesce(p_cost_price, 0), p_actor)
    returning id into v_id;

    return v_id;
end;
$$;

-- Inventory correction with no money attached: a recount, breakage, an opening
-- balance. Staff may do it; it writes a movement and moves the column, and it
-- posts nothing to the books (there is no purchase and no sale).
create or replace function adjust_stock(
    p_product_id uuid,
    p_delta      numeric,
    p_kind       text default 'adjustment',
    p_note       text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_actor uuid := auth.uid();
    v_move  uuid;
begin
    if not is_staff() then
        raise exception 'Réservé au personnel';
    end if;
    if p_delta is null or p_delta = 0 then
        raise exception 'Une correction de stock a besoin d''une quantité';
    end if;
    if p_kind not in ('adjustment','opening') then
        raise exception 'Type de mouvement invalide pour une correction';
    end if;
    if not exists (select 1 from products where id = p_product_id) then
        raise exception 'Produit introuvable';
    end if;

    update products set quantity = quantity + p_delta where id = p_product_id;

    insert into stock_movements (product_id, kind, quantity, note, created_by)
    values (p_product_id, p_kind, p_delta, p_note, v_actor)
    returning id into v_move;

    return v_move;
end;
$$;

-- ----------------------------------------------------------------------------
-- The storefront projection. SECURITY DEFINER so it can read `products` (which
-- anon cannot) but hand back only what the public may see: no cost, no sale
-- price, no exact count — availability as a boolean.
-- ----------------------------------------------------------------------------
create or replace function storefront_categories()
returns setof categories
language sql
stable
security definer
set search_path = public, auth
as $$
    select * from categories where is_active order by sort_order, name;
$$;

create or replace function storefront_products(
    p_category text    default null,
    p_search   text    default null,
    p_featured boolean default null,
    p_limit    int     default 60,
    p_offset   int     default 0
)
returns table (
    id            uuid,
    slug          text,
    sku           text,
    name          text,
    category_id   uuid,
    category_slug text,
    category_name text,
    description   text,
    material      text,
    specs         jsonb,
    unit          text,
    pack_size     text,
    image_url     text,
    gallery       jsonb,
    in_stock      boolean,
    is_featured   boolean
)
language sql
stable
security definer
set search_path = public, auth
as $$
    select
        p.id, p.slug, p.sku, p.name,
        p.category_id, c.slug, c.name,
        p.description, p.material, p.specs, p.unit, p.pack_size,
        p.image_url, p.gallery,
        (p.quantity > 0) as in_stock,
        p.is_featured
    from products p
    left join categories c on c.id = p.category_id
    where p.is_active
      and (p_category is null or c.slug = p_category)
      and (p_featured is null or p.is_featured = p_featured)
      and (
        p_search is null or btrim(p_search) = '' or
        to_tsvector('simple',
            coalesce(p.name,'') || ' ' || coalesce(p.sku,'') || ' ' ||
            coalesce(p.material,'') || ' ' || coalesce(p.description,''))
          @@ plainto_tsquery('simple', p_search)
        or p.name ilike '%' || p_search || '%'
      )
    order by p.is_featured desc, p.name
    limit greatest(coalesce(p_limit, 60), 1)
    offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function storefront_product(p_slug text)
returns table (
    id            uuid,
    slug          text,
    sku           text,
    name          text,
    category_id   uuid,
    category_slug text,
    category_name text,
    description   text,
    material      text,
    specs         jsonb,
    unit          text,
    pack_size     text,
    image_url     text,
    gallery       jsonb,
    in_stock      boolean,
    is_featured   boolean
)
language sql
stable
security definer
set search_path = public, auth
as $$
    select
        p.id, p.slug, p.sku, p.name,
        p.category_id, c.slug, c.name,
        p.description, p.material, p.specs, p.unit, p.pack_size,
        p.image_url, p.gallery,
        (p.quantity > 0) as in_stock,
        p.is_featured
    from products p
    left join categories c on c.id = p.category_id
    where p.is_active and p.slug = p_slug
    limit 1;
$$;

-- ----------------------------------------------------------------------------
-- Row level security.
-- ----------------------------------------------------------------------------
alter table categories      enable row level security;
alter table products        enable row level security;
alter table stock_movements enable row level security;

-- Categories: staff manage; anon reads through storefront_categories() only,
-- but an active category is not sensitive, so a public read of active rows is
-- allowed too (used to render the category chips without an RPC round-trip).
drop policy if exists "categories public read active" on categories;
create policy "categories public read active"
on categories for select using (is_active or is_staff());

drop policy if exists "categories staff write" on categories;
create policy "categories staff write"
on categories for insert with check (is_staff());
drop policy if exists "categories staff update" on categories;
create policy "categories staff update"
on categories for update using (is_staff()) with check (is_staff());
drop policy if exists "categories admin delete" on categories;
create policy "categories admin delete"
on categories for delete using (is_admin());

-- Products: staff only. No anon policy — the storefront never touches this table.
drop policy if exists "products staff read" on products;
create policy "products staff read"
on products for select using (is_staff());
drop policy if exists "products staff insert" on products;
create policy "products staff insert"
on products for insert with check (is_staff());
drop policy if exists "products staff update" on products;
create policy "products staff update"
on products for update using (is_staff()) with check (is_staff());
drop policy if exists "products admin delete" on products;
create policy "products admin delete"
on products for delete using (is_admin());

-- Stock movements: staff read; writes only through the definer functions above.
drop policy if exists "stock movements staff read" on stock_movements;
create policy "stock movements staff read"
on stock_movements for select using (is_staff());

-- ----------------------------------------------------------------------------
-- Grants (mirror dbms 063: born closed, opened deliberately).
-- ----------------------------------------------------------------------------
revoke execute on function ensure_product(text, numeric, numeric, uuid) from public;
revoke execute on function adjust_stock(uuid, numeric, text, text) from public;
revoke execute on function storefront_categories() from public;
revoke execute on function storefront_products(text, text, boolean, int, int) from public;
revoke execute on function storefront_product(text) from public;

do $$
begin
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
        grant execute on function adjust_stock(uuid, numeric, text, text) to authenticated;
        grant execute on function storefront_categories() to authenticated;
        grant execute on function storefront_products(text, text, boolean, int, int) to authenticated;
        grant execute on function storefront_product(text) to authenticated;
    end if;
    -- The street: the catalogue is public.
    if exists (select 1 from pg_roles where rolname = 'anon') then
        grant execute on function storefront_categories() to anon;
        grant execute on function storefront_products(text, text, boolean, int, int) to anon;
        grant execute on function storefront_product(text) to anon;
    end if;
end $$;

comment on table products is
    'What Fay sells: prices and count on hand. Never exposed to anon.';
comment on function storefront_products(text, text, boolean, int, int) is
    'Public catalogue projection — no prices, availability as a boolean only.';

-- ===== 0003_accounting.sql ===============================================

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

-- ===== 0004_purchases_sales.sql ==========================================

-- ============================================================================
-- 0004_purchases_sales.sql — money in and money out, tied to stock.
--
--   Purchases (achats)  — admin only. Goods arrive with a buying price: stock
--       goes up, the cost is remembered on the product, a receipt movement is
--       written, and the money out is posted to the books.
--   Sales (ventes)      — staff. Goods leave: stock goes down, the cost is
--       snapshotted onto the line so a later price change can't rewrite an old
--       margin, and the money in is posted.
--   Returns             — a sale with kind = 'return'; the goods come back and a
--       reversing entry is posted. Nothing is ever deleted.
--
-- All three reuse post_ledger_entry() from 0003 for the ledger side.
-- ============================================================================

create table if not exists suppliers (
    id         uuid primary key default gen_random_uuid(),
    name       text not null,
    phone      text,
    email      text,
    note       text,
    created_at timestamptz not null default now()
);

create table if not exists purchases (
    id          uuid primary key default gen_random_uuid(),
    supplier_id uuid references suppliers(id) on delete set null,
    occurred_at timestamptz not null default now(),
    total       numeric(14,2) not null default 0,
    method      text not null default 'cash',
    note        text,
    entry_id    uuid references journal_entries(id),
    recorded_by uuid references staff(id),
    created_at  timestamptz not null default now()
);

create index if not exists purchases_by_date on purchases (occurred_at desc);

create table if not exists purchase_lines (
    id          uuid primary key default gen_random_uuid(),
    purchase_id uuid not null references purchases(id) on delete cascade,
    product_id  uuid references products(id),
    name        text not null,
    quantity    numeric(14,3) not null check (quantity > 0),
    unit_cost   numeric(14,2) not null check (unit_cost >= 0),
    line_total  numeric(14,2) not null
);

create index if not exists purchase_lines_by_purchase on purchase_lines (purchase_id);

create table if not exists sales (
    id            uuid primary key default gen_random_uuid(),
    kind          text not null default 'sale' check (kind in ('sale','return')),
    occurred_at   timestamptz not null default now(),
    customer_name text,
    total         numeric(14,2) not null default 0,
    method        text not null default 'cash',
    note          text,
    entry_id      uuid references journal_entries(id),
    reverses_id   uuid references sales(id),
    quote_id      uuid,
    recorded_by   uuid references staff(id),
    created_at    timestamptz not null default now()
);

create index if not exists sales_by_date on sales (occurred_at desc);

create table if not exists sale_lines (
    id         uuid primary key default gen_random_uuid(),
    sale_id    uuid not null references sales(id) on delete cascade,
    product_id uuid references products(id),
    name       text not null,
    quantity   numeric(14,3) not null check (quantity > 0),
    unit_price numeric(14,2) not null check (unit_price >= 0),
    unit_cost  numeric(14,2) not null default 0,
    line_total numeric(14,2) not null
);

create index if not exists sale_lines_by_sale on sale_lines (sale_id);
create index if not exists sale_lines_by_product on sale_lines (product_id);

-- ── Receiving stock (a purchase) — admin only ───────────────────────────────
create or replace function record_purchase(
    p_lines       jsonb,               -- [{product_id?, name, quantity, unit_cost}]
    p_supplier_id uuid        default null,
    p_method      text        default 'cash',
    p_note        text        default null,
    p_occurred_at timestamptz default now()
)
returns uuid language plpgsql
security definer set search_path = public, auth
as $$
declare
    v_actor    uuid := auth.uid();
    v_purchase uuid;
    v_line     jsonb;
    v_product  uuid;
    v_name     text;
    v_qty      numeric;
    v_cost     numeric;
    v_total    numeric := 0;
    v_entry    uuid;
begin
    if not is_admin() then raise exception 'Réservé à l''administrateur'; end if;
    if p_lines is null or jsonb_typeof(p_lines) <> 'array'
       or jsonb_array_length(p_lines) = 0 then
        raise exception 'Un achat a besoin d''au moins une ligne';
    end if;

    insert into purchases (supplier_id, occurred_at, method, note, recorded_by)
    values (p_supplier_id, p_occurred_at, p_method, p_note, v_actor)
    returning id into v_purchase;

    for v_line in select * from jsonb_array_elements(p_lines)
    loop
        v_name := btrim(coalesce(v_line ->> 'name', ''));
        v_qty  := coalesce((v_line ->> 'quantity')::numeric, 0);
        v_cost := coalesce((v_line ->> 'unit_cost')::numeric, 0);
        if v_qty <= 0 then raise exception 'Chaque ligne a besoin d''une quantité > 0'; end if;

        v_product := nullif(v_line ->> 'product_id', '')::uuid;
        if v_product is null then
            if v_name = '' then raise exception 'Chaque ligne a besoin d''un produit ou d''un nom'; end if;
            v_product := ensure_product(v_name, p_cost_price => v_cost, p_actor => v_actor);
        end if;

        select name into v_name from products where id = v_product;
        if v_name is null then raise exception 'Produit introuvable'; end if;

        update products set
            quantity   = quantity + v_qty,
            cost_price = case when v_cost > 0 then v_cost else cost_price end
        where id = v_product;

        insert into stock_movements (product_id, kind, quantity, unit_cost, note, ref_id, created_by)
        values (v_product, 'receipt', v_qty, v_cost, p_note, v_purchase, v_actor);

        insert into purchase_lines (purchase_id, product_id, name, quantity, unit_cost, line_total)
        values (v_purchase, v_product, v_name, v_qty, v_cost, v_qty * v_cost);

        v_total := v_total + (v_qty * v_cost);
    end loop;

    if v_total > 0 then
        v_entry := post_ledger_entry(
            p_amount => v_total, p_direction => 'out',
            p_label => 'Achat de marchandise', p_actor => v_actor,
            p_category => 'Achats de marchandises', p_method => p_method,
            p_memo => p_note, p_details => jsonb_build_object('purchase_id', v_purchase),
            p_occurred_at => p_occurred_at);
    end if;

    update purchases set total = v_total, entry_id = v_entry where id = v_purchase;
    return v_purchase;
end;
$$;

-- ── Selling — staff ─────────────────────────────────────────────────────────
create or replace function record_sale(
    p_lines         jsonb,             -- [{product_id?, name, quantity, unit_price?}]
    p_customer_name text        default null,
    p_method        text        default 'cash',
    p_note          text        default null,
    p_quote_id      uuid        default null,
    p_occurred_at   timestamptz default now()
)
returns uuid language plpgsql
security definer set search_path = public, auth
as $$
declare
    v_actor  uuid := auth.uid();
    v_sale   uuid;
    v_line   jsonb;
    v_product uuid;
    v_name   text;
    v_qty    numeric;
    v_price  numeric;
    v_cost   numeric;
    v_total  numeric := 0;
    v_entry  uuid;
begin
    if not is_staff() then raise exception 'Réservé au personnel'; end if;
    if p_lines is null or jsonb_typeof(p_lines) <> 'array'
       or jsonb_array_length(p_lines) = 0 then
        raise exception 'Une vente a besoin d''au moins une ligne';
    end if;

    insert into sales (kind, occurred_at, customer_name, method, note, quote_id, recorded_by)
    values ('sale', p_occurred_at, p_customer_name, p_method, p_note, p_quote_id, v_actor)
    returning id into v_sale;

    for v_line in select * from jsonb_array_elements(p_lines)
    loop
        v_name  := btrim(coalesce(v_line ->> 'name', ''));
        v_qty   := coalesce((v_line ->> 'quantity')::numeric, 0);
        v_price := nullif(v_line ->> 'unit_price', '')::numeric;
        if v_qty <= 0 then raise exception 'Chaque ligne a besoin d''une quantité > 0'; end if;

        v_product := nullif(v_line ->> 'product_id', '')::uuid;
        if v_product is null then
            if v_name = '' then raise exception 'Chaque ligne a besoin d''un produit ou d''un nom'; end if;
            v_product := ensure_product(v_name, p_sale_price => v_price, p_actor => v_actor);
        end if;

        select name, cost_price, sale_price into v_name, v_cost, v_price
        from products where id = v_product;
        if v_name is null then raise exception 'Produit introuvable'; end if;
        -- Price on the line wins over the shelf price when one was passed.
        v_price := coalesce(nullif(v_line ->> 'unit_price', '')::numeric, v_price, 0);

        insert into sale_lines (sale_id, product_id, name, quantity, unit_price, unit_cost, line_total)
        values (v_sale, v_product, v_name, v_qty, v_price, coalesce(v_cost, 0), v_qty * v_price);

        -- Stock can go negative: a customer standing there matters more than a
        -- count that is the thing most likely to be wrong.
        update products set quantity = quantity - v_qty where id = v_product;
        insert into stock_movements (product_id, kind, quantity, note, ref_id, created_by)
        values (v_product, 'sale', -v_qty, p_note, v_sale, v_actor);

        v_total := v_total + (v_qty * v_price);
    end loop;

    if v_total > 0 then
        v_entry := post_ledger_entry(
            p_amount => v_total, p_direction => 'in', p_label => 'Vente',
            p_actor => v_actor, p_category => 'Ventes', p_method => p_method,
            p_memo => p_note, p_details => jsonb_build_object('sale_id', v_sale),
            p_occurred_at => p_occurred_at);
    end if;

    update sales set total = v_total, entry_id = v_entry where id = v_sale;
    return v_sale;
end;
$$;

create or replace function record_return(p_sale_id uuid, p_note text default null)
returns uuid language plpgsql
security definer set search_path = public, auth
as $$
declare
    v_actor  uuid := auth.uid();
    v_method text; v_total numeric; v_kind text; v_customer text;
    v_return uuid; v_line record; v_entry uuid;
    v_income uuid; v_cash uuid;
begin
    if not is_staff() then raise exception 'Réservé au personnel'; end if;
    select method, total, kind, customer_name into v_method, v_total, v_kind, v_customer
    from sales where id = p_sale_id;
    if v_method is null then raise exception 'Vente introuvable'; end if;
    if v_kind = 'return' then raise exception 'Ceci est déjà un retour'; end if;
    if exists (select 1 from sales where reverses_id = p_sale_id) then
        raise exception 'Cette vente a déjà été retournée';
    end if;

    insert into sales (kind, method, customer_name, note, total, reverses_id, recorded_by)
    values ('return', v_method, v_customer, p_note, v_total, p_sale_id, v_actor)
    returning id into v_return;

    for v_line in select * from sale_lines where sale_id = p_sale_id
    loop
        insert into sale_lines (sale_id, product_id, name, quantity, unit_price, unit_cost, line_total)
        values (v_return, v_line.product_id, v_line.name, v_line.quantity,
                v_line.unit_price, v_line.unit_cost, v_line.line_total);
        update products set quantity = quantity + v_line.quantity where id = v_line.product_id;
        insert into stock_movements (product_id, kind, quantity, note, ref_id, created_by)
        values (v_line.product_id, 'return', v_line.quantity, p_note, v_return, v_actor);
    end loop;

    if v_total > 0 then
        -- A sales return is contra-revenue, not an expense. Debit the SAME
        -- income account the sale credited (reducing revenue) and credit the
        -- cash it is refunded from. Routing this through post_ledger_entry with
        -- direction 'out' would instead mint a phantom EXPENSE account named
        -- 'Ventes', leaving gross revenue overstated and two accounts of the
        -- same name — so post the balanced entry directly here.
        v_income := ensure_account('Ventes', 'income', v_actor);
        v_cash   := resolve_cash_account(v_method, v_actor);
        insert into journal_entries (label, memo, details, created_by, occurred_at, created_at)
        values ('Retour de vente', p_note,
                jsonb_build_object('reverses', p_sale_id), v_actor, now(), now())
        returning id into v_entry;
        insert into journal_lines (journal_entry_id, account_id, debit, credit) values
            (v_entry, v_income, v_total, 0),
            (v_entry, v_cash,   0,       v_total);
        update sales set entry_id = v_entry where id = v_return;
    end if;
    return v_return;
end;
$$;

-- ── Reports ──────────────────────────────────────────────────────────────────

-- The day, one row. Staff-visible: they run the sales.
create or replace function store_day(p_on date default current_date)
returns table (sales_total numeric, returns_total numeric, net_sales numeric,
               sale_count int, items_sold numeric)
language sql stable security definer set search_path = public, auth as $$
    select
        coalesce(sum(s.total) filter (where s.kind = 'sale'), 0),
        coalesce(sum(s.total) filter (where s.kind = 'return'), 0),
        coalesce(sum(s.total) filter (where s.kind = 'sale'), 0)
          - coalesce(sum(s.total) filter (where s.kind = 'return'), 0),
        count(*) filter (where s.kind = 'sale')::int,
        -- Guarded independently: this scalar subquery is evaluated even when the
        -- outer `where is_staff()` filters every row, so a non-staff caller must
        -- not learn the day's volume through it.
        case when is_staff() then
            coalesce((select sum(l.quantity) from sale_lines l join sales s2 on s2.id = l.sale_id
                      where s2.kind = 'sale' and (s2.occurred_at at time zone 'UTC')::date = p_on), 0)
        else 0 end
    from sales s
    where is_staff() and (s.occurred_at at time zone 'UTC')::date = p_on;
$$;

-- Products at or below their reorder threshold. Staff-visible.
create or replace function low_stock()
returns table (product_id uuid, name text, sku text, quantity numeric,
               low_stock_at numeric, unit text)
language sql stable security definer set search_path = public, auth as $$
    select p.id, p.name, p.sku, p.quantity, p.low_stock_at, p.unit
    from products p
    where is_staff() and p.is_active and p.low_stock_at is not null
      and p.quantity <= p.low_stock_at
    order by (p.quantity - p.low_stock_at), p.name;
$$;

-- Value of stock on hand at cost. Admin only (uses buying price).
create or replace function inventory_value()
returns numeric language sql stable security definer set search_path = public, auth as $$
    select case when is_admin()
        then coalesce(round(sum(p.quantity * p.cost_price), 2), 0) else 0 end
    from products p where p.is_active and p.quantity > 0;
$$;

-- Sales with margin over a window. Admin only (reveals cost/margin).
create or replace function sales_report(p_from date default null, p_to date default null)
returns table (revenue numeric, cost numeric, margin numeric, sale_count int)
language sql stable security definer set search_path = public, auth as $$
    with l as (
        select l.quantity, l.unit_price, l.unit_cost, s.kind, s.id as sale_id
        from sale_lines l join sales s on s.id = l.sale_id
        where is_admin()
          and (p_from is null or s.occurred_at::date >= p_from)
          and (p_to   is null or s.occurred_at::date <= p_to)
    )
    select
        coalesce(sum(case when kind='sale' then quantity*unit_price else -quantity*unit_price end), 0),
        coalesce(sum(case when kind='sale' then quantity*unit_cost  else -quantity*unit_cost  end), 0),
        coalesce(sum(case when kind='sale' then quantity*(unit_price-unit_cost)
                          else -quantity*(unit_price-unit_cost) end), 0),
        count(distinct sale_id) filter (where kind='sale')::int
    from l;
$$;

-- Daily net sales for the last N days, for the dashboard chart. Staff-visible.
create or replace function sales_by_day(p_days int default 14)
returns table (day date, net_sales numeric, sale_count int)
language sql stable security definer set search_path = public, auth as $$
    with days as (
        select generate_series(current_date - (greatest(p_days,1) - 1), current_date, '1 day')::date as day
    )
    select d.day,
        coalesce(sum(case when s.kind='sale' then s.total when s.kind='return' then -s.total else 0 end), 0),
        count(s.id) filter (where s.kind='sale')::int
    from days d
    left join sales s on (s.occurred_at at time zone 'UTC')::date = d.day and is_staff()
    where is_staff()
    group by d.day order by d.day;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table suppliers      enable row level security;
alter table purchases      enable row level security;
alter table purchase_lines enable row level security;
alter table sales          enable row level security;
alter table sale_lines     enable row level security;

-- Suppliers & purchases are money: admin only.
drop policy if exists "suppliers admin all" on suppliers;
create policy "suppliers admin all" on suppliers for all using (is_admin()) with check (is_admin());
drop policy if exists "purchases admin read" on purchases;
create policy "purchases admin read" on purchases for select using (is_admin());
drop policy if exists "purchase lines admin read" on purchase_lines;
create policy "purchase lines admin read" on purchase_lines for select using (is_admin());

-- Sales are staff: they record and review them. Writes go through the functions.
drop policy if exists "sales staff read" on sales;
create policy "sales staff read" on sales for select using (is_staff());
drop policy if exists "sale lines staff read" on sale_lines;
create policy "sale lines staff read" on sale_lines for select using (
    exists (select 1 from sales s where s.id = sale_id and is_staff())
);

-- ── Grants ─────────────────────────────────────────────────────────────────────
revoke execute on function record_purchase(jsonb, uuid, text, text, timestamptz) from public;
revoke execute on function record_sale(jsonb, text, text, text, uuid, timestamptz) from public;
revoke execute on function record_return(uuid, text) from public;
revoke execute on function store_day(date) from public;
revoke execute on function low_stock() from public;
revoke execute on function inventory_value() from public;
revoke execute on function sales_report(date, date) from public;
revoke execute on function sales_by_day(int) from public;

do $$
begin
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
        grant execute on function record_purchase(jsonb, uuid, text, text, timestamptz) to authenticated;
        grant execute on function record_sale(jsonb, text, text, text, uuid, timestamptz) to authenticated;
        grant execute on function record_return(uuid, text) to authenticated;
        grant execute on function store_day(date) to authenticated;
        grant execute on function low_stock() to authenticated;
        grant execute on function inventory_value() to authenticated;
        grant execute on function sales_report(date, date) to authenticated;
        grant execute on function sales_by_day(int) to authenticated;
    end if;
end $$;

-- ===== 0005_quotes.sql ===================================================

-- ============================================================================
-- 0005_quotes.sql — devis (quote requests), the whole point of the storefront.
--
-- Fay sells by the lot and shows no prices, so the public's action is not "buy"
-- but "request a quote". The storefront collects a basket of products with the
-- quantities wanted and the caller's contact details, and submits it as one
-- quote_request. Anon may create one (through a validating function, never a raw
-- insert); staff read and work them; converting a won quote into a sale carries
-- the quote id onto the sale.
-- ============================================================================

create sequence if not exists quote_seq start 1;

create table if not exists quote_requests (
    id            uuid primary key default gen_random_uuid(),
    ref           text not null unique,
    status        text not null default 'new'
                  check (status in ('new','in_review','quoted','won','lost','cancelled')),
    customer_name text not null,
    company       text,
    phone         text not null,
    email         text,
    message       text,
    note          text,                 -- internal
    quoted_total  numeric(14,2),
    quoted_at     timestamptz,
    handled_by    uuid references staff(id),
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index if not exists quote_requests_by_status on quote_requests (status, created_at desc);

drop trigger if exists quote_requests_updated_at on quote_requests;
create trigger quote_requests_updated_at before update on quote_requests
    for each row execute function set_updated_at();

create table if not exists quote_items (
    id        uuid primary key default gen_random_uuid(),
    quote_id  uuid not null references quote_requests(id) on delete cascade,
    product_id uuid references products(id) on delete set null,
    name      text not null,
    quantity  numeric(14,3) not null default 1 check (quantity > 0),
    unit      text,
    note      text
);

create index if not exists quote_items_by_quote on quote_items (quote_id);

-- ── The public submission path (anon) ────────────────────────────────────────
-- Payload: { customer_name, company?, phone, email?, message?, items:[{product_id?, name, quantity, unit?, note?}] }
create or replace function submit_quote_request(p_payload jsonb)
returns text language plpgsql
security definer set search_path = public, auth
as $$
declare
    v_ref   text;
    v_id    uuid;
    v_name  text := btrim(coalesce(p_payload ->> 'customer_name', ''));
    v_phone text := btrim(coalesce(p_payload ->> 'phone', ''));
    v_items jsonb := p_payload -> 'items';
    v_item  jsonb;
    v_pname text;
    v_qty   numeric;
    v_count int := 0;
begin
    if v_name = '' then raise exception 'Le nom est requis'; end if;
    if v_phone = '' then raise exception 'Le téléphone est requis'; end if;
    if v_items is null or jsonb_typeof(v_items) <> 'array'
       or jsonb_array_length(v_items) = 0 then
        raise exception 'Ajoutez au moins un produit à votre demande';
    end if;
    if jsonb_array_length(v_items) > 200 then
        raise exception 'Trop d''articles dans une seule demande';
    end if;

    v_ref := 'DV-' || to_char(now(), 'YYYY') || '-' ||
             lpad(nextval('quote_seq')::text, 4, '0');

    insert into quote_requests (ref, customer_name, company, phone, email, message)
    values (v_ref, v_name,
            nullif(btrim(coalesce(p_payload ->> 'company', '')), ''),
            v_phone,
            nullif(btrim(coalesce(p_payload ->> 'email', '')), ''),
            nullif(btrim(coalesce(p_payload ->> 'message', '')), ''))
    returning id into v_id;

    for v_item in select * from jsonb_array_elements(v_items)
    loop
        v_pname := btrim(coalesce(v_item ->> 'name', ''));
        v_qty   := coalesce((v_item ->> 'quantity')::numeric, 1);
        if v_pname = '' then continue; end if;
        if v_qty <= 0 then v_qty := 1; end if;
        insert into quote_items (quote_id, product_id, name, quantity, unit, note)
        values (v_id,
                nullif(v_item ->> 'product_id', '')::uuid,
                v_pname, v_qty,
                nullif(btrim(coalesce(v_item ->> 'unit', '')), ''),
                nullif(btrim(coalesce(v_item ->> 'note', '')), ''));
        v_count := v_count + 1;
    end loop;

    if v_count = 0 then
        raise exception 'Ajoutez au moins un produit valide à votre demande';
    end if;

    return v_ref;
end;
$$;

-- ── Staff working a quote ────────────────────────────────────────────────────
create or replace function update_quote(
    p_id uuid, p_status text default null,
    p_note text default null, p_quoted_total numeric default null
)
returns void language plpgsql
security definer set search_path = public, auth
as $$
begin
    if not is_staff() then raise exception 'Réservé au personnel'; end if;
    update quote_requests set
        status       = coalesce(nullif(p_status, ''), status),
        note         = coalesce(p_note, note),
        quoted_total = coalesce(p_quoted_total, quoted_total),
        quoted_at    = case when p_quoted_total is not null then now() else quoted_at end,
        handled_by   = auth.uid()
    where id = p_id;
    if not found then raise exception 'Demande introuvable'; end if;
end;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table quote_requests enable row level security;
alter table quote_items    enable row level security;

-- No anon read or write policy: the public reaches this table only through
-- submit_quote_request(). Staff read and manage everything.
drop policy if exists "quotes staff read" on quote_requests;
create policy "quotes staff read" on quote_requests for select using (is_staff());
drop policy if exists "quotes staff update" on quote_requests;
create policy "quotes staff update" on quote_requests for update using (is_staff()) with check (is_staff());

drop policy if exists "quote items staff read" on quote_items;
create policy "quote items staff read" on quote_items for select using (
    exists (select 1 from quote_requests q where q.id = quote_id and is_staff())
);

-- ── Grants ─────────────────────────────────────────────────────────────────────
revoke execute on function submit_quote_request(jsonb) from public;
revoke execute on function update_quote(uuid, text, text, numeric) from public;

do $$
begin
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
        grant execute on function submit_quote_request(jsonb) to authenticated;
        grant execute on function update_quote(uuid, text, text, numeric) to authenticated;
    end if;
    if exists (select 1 from pg_roles where rolname = 'anon') then
        grant execute on function submit_quote_request(jsonb) to anon;
    end if;
end $$;

comment on function submit_quote_request(jsonb) is
    'Public: create a quote request (devis) with items. Returns the human ref.';

-- ===== 0006_cms.sql ======================================================

-- ============================================================================
-- 0006_cms.sql — "edit every part of the webapp".
--
-- Three editable surfaces, all admin-writable and publicly readable:
--   site_content — keyed jsonb singletons (hero, about, contact, home, seo,
--                  footer). The app merges each over a built-in default, so a
--                  missing key is fine and the site is never blank.
--   banners      — promotional pictures and hero slides, with an optional link
--                  and an optional active window.
--   partners     — partner / supplier logos shown as an "ils nous font
--                  confiance" strip.
-- ============================================================================

create table if not exists site_content (
    key        text primary key,
    value      jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    updated_by uuid references staff(id)
);

drop trigger if exists site_content_updated_at on site_content;
create trigger site_content_updated_at before update on site_content
    for each row execute function set_updated_at();

create table if not exists banners (
    id         uuid primary key default gen_random_uuid(),
    kind       text not null default 'promo' check (kind in ('promo','hero_slide')),
    title      text,
    subtitle   text,
    image_url  text,
    link_url   text,
    cta_label  text,
    sort_order int not null default 0,
    is_active  boolean not null default true,
    starts_on  date,
    ends_on    date,
    created_at timestamptz not null default now()
);

create index if not exists banners_active on banners (kind, sort_order) where is_active;

create table if not exists partners (
    id         uuid primary key default gen_random_uuid(),
    name       text not null,
    logo_url   text,
    link_url   text,
    sort_order int not null default 0,
    is_active  boolean not null default true,
    created_at timestamptz not null default now()
);

create index if not exists partners_active on partners (sort_order) where is_active;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table site_content enable row level security;
alter table banners      enable row level security;
alter table partners     enable row level security;

-- Site content is public by design (it IS the public site).
drop policy if exists "content public read" on site_content;
create policy "content public read" on site_content for select using (true);
drop policy if exists "content admin write" on site_content;
create policy "content admin write" on site_content for insert with check (is_admin());
drop policy if exists "content admin update" on site_content;
create policy "content admin update" on site_content for update using (is_admin()) with check (is_admin());
drop policy if exists "content admin delete" on site_content;
create policy "content admin delete" on site_content for delete using (is_admin());

-- Banners & partners: the public sees active rows (and only within the active
-- window, for banners); staff see all so they can manage the inactive ones.
drop policy if exists "banners public read" on banners;
create policy "banners public read" on banners for select using (
    is_staff() or (
        is_active
        and (starts_on is null or starts_on <= current_date)
        and (ends_on   is null or ends_on   >= current_date)
    )
);
drop policy if exists "banners admin write" on banners;
create policy "banners admin write" on banners for all using (is_admin()) with check (is_admin());

drop policy if exists "partners public read" on partners;
create policy "partners public read" on partners for select using (is_active or is_staff());
drop policy if exists "partners admin write" on partners;
create policy "partners admin write" on partners for all using (is_admin()) with check (is_admin());

comment on table site_content is
    'Keyed jsonb content for the vitrine. Public read, admin write.';

-- ===== 0007_seed.sql =====================================================

-- ============================================================================
-- 0007_seed.sql — a business ready to demo on first boot.
--
-- Idempotent: every insert is guarded by ON CONFLICT DO NOTHING, so running the
-- whole migration bundle again changes nothing. Prices and quantities here are
-- placeholders for the demo — the admin sets the real ones.
--
-- The first administrator cannot be seeded (there is no auth user yet). After
-- the owner has signed up once, promote them from the Supabase SQL editor:
--
--   insert into staff (id, full_name, role)
--   select id, 'Faïçal — Fay & Partenaires', 'admin'
--   from auth.users where email = 'OWNER-EMAIL-HERE'
--   on conflict (id) do update set role = 'admin', is_active = true;
-- ============================================================================

-- The chart of accounts.
select seed_chart_of_accounts();

-- The six fastener families.
insert into categories (slug, name, description, sort_order) values
    ('boulonnerie',     'Boulonnerie',      'Boulons de tous types et diamètres, en acier et matériaux spéciaux.', 1),
    ('visserie',        'Visserie',         'Vis pour métal, bois et applications techniques.', 2),
    ('ecrous',          'Écrous',           'Écrous hexagonaux, freins, borgnes et à embase.', 3),
    ('rondelles',       'Rondelles',        'Rondelles plates, éventail, grower et de blocage.', 4),
    ('tiges-d-ancrage', 'Tiges d''ancrage', 'Tiges filetées et d''ancrage pour le génie civil.', 5),
    ('roulements',      'Roulements',       'Roulements à billes et à rouleaux pour la mécanique.', 6)
on conflict (slug) do nothing;

-- A handful of demo products across the families.
insert into products (slug, sku, name, category_id, description, material, specs, unit, pack_size, cost_price, sale_price, quantity, low_stock_at, is_featured)
select v.slug, v.sku, v.name,
       (select id from categories c where c.slug = v.cat),
       v.description, v.material, v.specs::jsonb, v.unit, v.pack_size,
       v.cost_price, v.sale_price, v.quantity, v.low_stock_at, v.is_featured
from (values
    ('boulon-hm-10x40', 'BLN-1040', 'Boulon HM 10 x 40', 'boulonnerie',
     'Boulon tête hexagonale, filetage métrique, classe 8.8.', 'Acier au carbone zingué',
     '{"Diamètre":"M10","Longueur":"40 mm","Classe":"8.8","Filetage":"Métrique"}',
     'boîte', 'Boîte de 100', 15000, 22000, 240, 40, true),
    ('boulon-hm-12x60', 'BLN-1260', 'Boulon HM 12 x 60', 'boulonnerie',
     'Boulon tête hexagonale haute résistance pour charpente.', 'Acier allié galvanisé à chaud',
     '{"Diamètre":"M12","Longueur":"60 mm","Classe":"10.9","Finition":"Galvanisé à chaud"}',
     'boîte', 'Boîte de 50', 22000, 32000, 120, 25, true),
    ('vis-tole-4-8x19', 'VIS-4819', 'Vis à tôle 4.8 x 19', 'visserie',
     'Vis autoperceuse tête bombée cruciforme.', 'Acier inoxydable A2',
     '{"Diamètre":"4.8 mm","Longueur":"19 mm","Empreinte":"Phillips","Tête":"Bombée"}',
     'sachet', 'Sachet de 200', 6000, 9500, 180, 30, true),
    ('vis-bois-5x50', 'VIS-0550', 'Vis à bois 5 x 50', 'visserie',
     'Vis à bois filetage partiel, tête fraisée Torx.', 'Acier zingué',
     '{"Diamètre":"5 mm","Longueur":"50 mm","Empreinte":"Torx","Tête":"Fraisée"}',
     'boîte', 'Boîte de 200', 7000, 11000, 90, 20, false),
    ('ecrou-hexagonal-m10', 'ECR-M10', 'Écrou hexagonal M10', 'ecrous',
     'Écrou hexagonal standard ISO 4032.', 'Acier au carbone zingué',
     '{"Diamètre":"M10","Type":"Hexagonal","Norme":"ISO 4032"}',
     'boîte', 'Boîte de 200', 4000, 6500, 300, 50, true),
    ('ecrou-frein-m12', 'ECR-F12', 'Écrou frein M12', 'ecrous',
     'Écrou autofreiné à bague nylon (Nylstop).', 'Acier + bague nylon',
     '{"Diamètre":"M12","Type":"Frein (Nylstop)","Matière bague":"Nylon"}',
     'boîte', 'Boîte de 100', 6000, 9000, 60, 15, false),
    ('rondelle-plate-m10', 'RND-P10', 'Rondelle plate M10', 'rondelles',
     'Rondelle plate large ISO 7093.', 'Acier inoxydable A2',
     '{"Diamètre intérieur":"10,5 mm","Type":"Plate large","Norme":"ISO 7093"}',
     'sachet', 'Sachet de 500', 3000, 5000, 400, 80, false),
    ('rondelle-grower-m10', 'RND-G10', 'Rondelle Grower M10', 'rondelles',
     'Rondelle élastique fendue (grower) anti-desserrage.', 'Acier ressort',
     '{"Diamètre":"M10","Type":"Grower (fendue)"}',
     'sachet', 'Sachet de 500', 3500, 5500, 260, 60, false),
    ('tige-filetee-m12-1m', 'TIG-M12', 'Tige filetée M12 — 1 m', 'tiges-d-ancrage',
     'Tige filetée métrique en barre de 1 mètre.', 'Acier zingué',
     '{"Diamètre":"M12","Longueur":"1000 mm","Filetage":"Métrique intégral"}',
     'lot', 'Lot de 10 barres', 18000, 27000, 45, 10, true),
    ('tige-ancrage-m16', 'TIG-A16', 'Tige d''ancrage M16', 'tiges-d-ancrage',
     'Tige d''ancrage à scellement pour béton.', 'Acier galvanisé à chaud',
     '{"Diamètre":"M16","Type":"Ancrage / scellement","Finition":"Galvanisé à chaud"}',
     'lot', 'Lot de 25', 30000, 44000, 20, 8, false),
    ('roulement-6204-2rs', 'RLT-6204', 'Roulement 6204 2RS', 'roulements',
     'Roulement à billes étanche, gorge profonde.', 'Acier chromé',
     '{"Référence":"6204-2RS","Alésage":"20 mm","Extérieur":"47 mm","Largeur":"14 mm"}',
     'pièce', 'À l''unité', 3500, 6000, 75, 15, true),
    ('roulement-6205-2rs', 'RLT-6205', 'Roulement 6205 2RS', 'roulements',
     'Roulement à billes étanche, gorge profonde.', 'Acier chromé',
     '{"Référence":"6205-2RS","Alésage":"25 mm","Extérieur":"52 mm","Largeur":"15 mm"}',
     'pièce', 'À l''unité', 4000, 7000, 55, 15, false)
) as v(slug, sku, name, cat, description, material, specs, unit, pack_size, cost_price, sale_price, quantity, low_stock_at, is_featured)
on conflict (slug) do nothing;

-- Record the demo opening stock as opening movements (idempotent-ish: only if a
-- product has no movements yet).
insert into stock_movements (product_id, kind, quantity, unit_cost, note)
select p.id, 'opening', p.quantity, p.cost_price, 'Stock initial (démo)'
from products p
where p.quantity > 0
  and not exists (select 1 from stock_movements m where m.product_id = p.id);

-- A demo promo banner.
insert into banners (kind, title, subtitle, cta_label, link_url, sort_order, is_active)
select 'promo', 'Devis gratuit sous 24h',
       'Envoyez votre liste de fixations, recevez une offre chiffrée rapidement.',
       'Demander un devis', '/devis', 1, true
where not exists (select 1 from banners);

-- Demo partner strip (logos left blank — the admin uploads them).
insert into partners (name, sort_order, is_active)
select v.name, v.ord, true
from (values ('BTP Sahel', 1), ('Mines du Faso', 2), ('Agro-Industrie SA', 3), ('Atelier Méca+', 4)) as v(name, ord)
where not exists (select 1 from partners);

-- ===== 0008_storage.sql ==================================================

-- ============================================================================
-- 0008_storage.sql — the public media bucket for images.
--
-- Product photos, category images, promo banners and partner logos all live in
-- one public bucket. Anyone may read (the storefront shows them); only staff may
-- upload, replace, or delete. Object paths are namespaced by folder
-- (products/, banners/, …) purely for tidiness — the policy is per-bucket.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Public read: the vitrine serves these images to signed-out visitors.
drop policy if exists "media public read" on storage.objects;
create policy "media public read"
on storage.objects for select
using (bucket_id = 'media');

-- Staff write. Uploading a new object, replacing one, and removing one are all
-- gated by is_staff() from 0001.
drop policy if exists "media staff insert" on storage.objects;
create policy "media staff insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'media' and is_staff());

drop policy if exists "media staff update" on storage.objects;
create policy "media staff update"
on storage.objects for update to authenticated
using (bucket_id = 'media' and is_staff())
with check (bucket_id = 'media' and is_staff());

drop policy if exists "media staff delete" on storage.objects;
create policy "media staff delete"
on storage.objects for delete to authenticated
using (bucket_id = 'media' and is_staff());

-- Recharge le cache de schéma de PostgREST pour exposer les nouvelles fonctions.
notify pgrst, 'reload schema';
