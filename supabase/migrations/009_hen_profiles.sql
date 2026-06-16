-- ============================================================
-- Migration 009 — Hen profile photos (self-serve)
--
-- Each hen can claim her name on the roster and add a selfie + a
-- one-line "how I know Grace". Photos live in a public `avatars`
-- bucket (each guest can only write their own folder). Profiles
-- key off the curated hen id from src/lib/hens.ts.
--
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.
-- ============================================================

create table if not exists public.hen_profiles (
  hen_id      text primary key,            -- matches an id in lib/hens.ts
  avatar_path text,                          -- path in the 'avatars' bucket
  note        text,                          -- "how I know Grace" (<=140)
  claimed_by  uuid references public.guests(id) on delete set null,
  updated_at  timestamptz not null default now()
);

alter table public.hen_profiles enable row level security;

drop policy if exists "hen_profiles readable" on public.hen_profiles;
create policy "hen_profiles readable" on public.hen_profiles
  for select to authenticated using (true);

drop policy if exists "hen_profiles claim" on public.hen_profiles;
create policy "hen_profiles claim" on public.hen_profiles
  for insert to authenticated with check (claimed_by = auth.uid());

drop policy if exists "hen_profiles edit own" on public.hen_profiles;
create policy "hen_profiles edit own" on public.hen_profiles
  for update to authenticated
  using (claimed_by = auth.uid()) with check (claimed_by = auth.uid());

-- Live updates so faces appear for everyone as they're added.
do $$ begin
  alter publication supabase_realtime add table public.hen_profiles;
exception when duplicate_object then null; end $$;

-- ─── PUBLIC AVATARS BUCKET ───────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select to public using (bucket_id = 'avatars');

drop policy if exists "avatars upload own" on storage.objects;
create policy "avatars upload own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
