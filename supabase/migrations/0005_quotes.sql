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
