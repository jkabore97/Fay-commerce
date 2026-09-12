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
        v_entry := post_ledger_entry(
            p_amount => v_total, p_direction => 'out', p_label => 'Retour de vente',
            p_actor => v_actor, p_category => 'Ventes', p_method => v_method,
            p_memo => p_note, p_details => jsonb_build_object('reverses', p_sale_id));
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
        coalesce((select sum(l.quantity) from sale_lines l join sales s2 on s2.id = l.sale_id
                  where s2.kind = 'sale' and (s2.occurred_at at time zone 'UTC')::date = p_on), 0)
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
