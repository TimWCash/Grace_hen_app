-- ============================================================
-- Migration 010 — Voice notes ("a favourite Grace memory")
--
-- Each hen records (or uploads) a short voice note of her favourite
-- memory of Grace. They play back on /memories as a shared wall —
-- a keepsake Grace can replay forever. Audio lives in a public
-- `voicenotes` bucket; each guest can only write her own folder.
--
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.
-- ============================================================

create table if not exists public.voice_notes (
  id            uuid primary key default gen_random_uuid(),
  guest_id      uuid not null references public.guests(id) on delete cascade,
  storage_path  text not null,                 -- path in the 'voicenotes' bucket
  duration_secs numeric,                        -- length, for the UI
  created_at    timestamptz not null default now()
);
create index if not exists voice_notes_created_idx
  on public.voice_notes (created_at desc);

alter table public.voice_notes enable row level security;

-- Anyone signed in can hear everyone's memories.
drop policy if exists "voice_notes readable" on public.voice_notes;
create policy "voice_notes readable" on public.voice_notes
  for select to authenticated using (true);

-- You can only post as yourself.
drop policy if exists "voice_notes insert self" on public.voice_notes;
create policy "voice_notes insert self" on public.voice_notes
  for insert to authenticated with check (guest_id = auth.uid());

-- You can delete your own (admins can tidy any).
drop policy if exists "voice_notes delete own" on public.voice_notes;
create policy "voice_notes delete own" on public.voice_notes
  for delete to authenticated
  using (guest_id = auth.uid() or public.is_admin());

-- Live updates so new memories appear for everyone as they land.
do $$ begin
  alter publication supabase_realtime add table public.voice_notes;
exception when duplicate_object then null; end $$;

-- ─── PUBLIC VOICENOTES BUCKET ────────────────────────────────
insert into storage.buckets (id, name, public)
values ('voicenotes', 'voicenotes', true)
on conflict (id) do nothing;

drop policy if exists "voicenotes public read" on storage.objects;
create policy "voicenotes public read" on storage.objects
  for select to public using (bucket_id = 'voicenotes');

drop policy if exists "voicenotes upload own" on storage.objects;
create policy "voicenotes upload own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'voicenotes' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "voicenotes delete own" on storage.objects;
create policy "voicenotes delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'voicenotes' and (storage.foldername(name))[1] = auth.uid()::text
  );
