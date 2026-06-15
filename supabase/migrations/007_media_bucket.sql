-- ============================================================
-- Migration 007 — Media bucket for Mark's video
--
-- A public bucket the admin (Claire/Fiona) can upload Mark's video
-- into from the Concierge dashboard, so it can be sent to every
-- phone without a redeploy. Public read (it's broadcast to all hens
-- anyway); admin-only write.
--
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects
  for select to public using (bucket_id = 'media');

drop policy if exists "media admin upload" on storage.objects;
create policy "media admin upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "media admin update" on storage.objects;
create policy "media admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.is_admin());
