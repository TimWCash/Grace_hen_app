-- ============================================================
-- Migration 010 — Favourite-Grace-memory notes (voice OR text)
--
-- Each hen leaves a favourite memory of Grace: either a short
-- voice note OR a typed note (<=200 chars). They play / read back
-- on /memories as a shared wall — a keepsake Grace keeps forever.
-- Audio lives in a public `voicenotes` bucket (own folder only).
--
-- Fully idempotent — safe to run on a fresh DB or to upgrade an
-- earlier (voice-only) version of this table. Paste & Run.
-- ============================================================

create table if not exists public.voice_notes (
  id            uuid primary key default gen_random_uuid(),
  guest_id      uuid not null references public.guests(id) on delete cascade,
  storage_path  text,                          -- audio path (null for a text note)
  body          text,                          -- typed memory, <=200 chars (null for voice)
  duration_secs numeric,
  created_at    timestamptz not null default now()
);

-- Bring an earlier voice-only install up to the voice-or-text shape.
alter table public.voice_notes add column if not exists body text;
alter table public.voice_notes alter column storage_path drop not null;
alter table public.voice_notes drop constraint if exists voice_notes_has_content;
alter table public.voice_notes add constraint voice_notes_has_content
  check (storage_path is not null or (body is not null and btrim(body) <> ''));
alter table public.voice_notes drop constraint if exists voice_notes_body_len;
alter table public.voice_notes add constraint voice_notes_body_len
  check (body is null or length(body) <= 200);

create index if not exists voice_notes_created_idx
  on public.voice_notes (created_at desc);

alter table public.voice_notes enable row level security;

-- Is the current guest the bride? (mirrors is_admin) — used to keep the
-- memories a surprise: Grace can't read them.
create or replace function public.is_bride()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select is_bride from public.guests where id = auth.uid()), false);
$$;
grant execute on function public.is_bride() to anon, authenticated;

-- Everyone signed in can read the memories — EXCEPT Grace (it's a surprise).
drop policy if exists "voice_notes readable" on public.voice_notes;
create policy "voice_notes readable" on public.voice_notes
  for select to authenticated using (not public.is_bride());

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
