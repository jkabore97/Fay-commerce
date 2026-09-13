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
