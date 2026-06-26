-- ============================================================
-- Migration 011 — Web push subscriptions
--
-- Stores each device's push subscription so a closed/locked phone still
-- gets the "time to move" alerts. The /api/push Vercel route reads these
-- (only for an admin caller, via push_targets) and sends the notifications.
--
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.
-- ============================================================

create table if not exists public.push_subscriptions (
  guest_id     uuid primary key references public.guests(id) on delete cascade,
  subscription jsonb not null,
  updated_at   timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_sub self insert" on public.push_subscriptions;
create policy "push_sub self insert" on public.push_subscriptions
  for insert to authenticated with check (guest_id = auth.uid());

drop policy if exists "push_sub self update" on public.push_subscriptions;
create policy "push_sub self update" on public.push_subscriptions
  for update to authenticated
  using (guest_id = auth.uid()) with check (guest_id = auth.uid());

drop policy if exists "push_sub self read" on public.push_subscriptions;
create policy "push_sub self read" on public.push_subscriptions
  for select to authenticated using (guest_id = auth.uid());

-- Returns every subscription, but ONLY when the caller is an admin (so the
-- /api/push route, called with Fiona's token, can fan out to everyone).
create or replace function public.push_targets()
returns setof jsonb
language sql security definer set search_path = ''
as $$
  select subscription from public.push_subscriptions where public.is_admin();
$$;
grant execute on function public.push_targets() to authenticated;
