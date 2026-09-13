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
