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
