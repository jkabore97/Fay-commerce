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
