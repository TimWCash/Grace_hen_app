-- ============================================================
-- Migration 003 — Live Night
-- Broadcasts (GO alerts / notices / Mark's video / mission
-- overrides), Field Notes, drink pre-orders, admin functions,
-- realtime publication membership.
--
-- Paste this whole file into the Supabase SQL Editor and Run.
-- Safe to re-run.
-- ============================================================

-- ─── BROADCASTS ──────────────────────────────────────────────
drop table if exists public.broadcasts cascade;
create table public.broadcasts (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('go','notice','video','mission','warning')),
  payload     jsonb not null default '{}',
  created_by  uuid references public.guests(id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz
);
create index broadcasts_created_idx on public.broadcasts (created_at desc);

alter table public.broadcasts enable row level security;

create policy "broadcasts readable" on public.broadcasts
  for select to authenticated using (true);
create policy "broadcasts admin insert" on public.broadcasts
  for insert to authenticated with check (public.is_admin());

-- ─── FIELD NOTES ─────────────────────────────────────────────
drop table if exists public.field_notes cascade;
create table public.field_notes (
  id          uuid primary key default gen_random_uuid(),
  guest_id    uuid not null references public.guests(id) on delete cascade,
  message     text not null check (length(message) between 1 and 280),
  created_at  timestamptz not null default now()
);
create index field_notes_created_idx on public.field_notes (created_at desc);

alter table public.field_notes enable row level security;

create policy "field_notes readable" on public.field_notes
  for select to authenticated using (true);
create policy "field_notes insert self" on public.field_notes
  for insert to authenticated with check (guest_id = auth.uid());

-- ─── STOP MENUS (curated drink options per bar) ──────────────
drop table if exists public.drink_orders cascade;
drop table if exists public.stop_menus cascade;
create table public.stop_menus (
  id        uuid primary key default gen_random_uuid(),
  stop_id   uuid not null references public.stops(id) on delete cascade,
  position  integer not null,
  label     text not null,
  note      text            -- short tasting note (e.g. "strong, deep, rich")
);
create index stop_menus_stop_idx on public.stop_menus (stop_id, position);

alter table public.stop_menus enable row level security;

create policy "stop_menus readable" on public.stop_menus
  for select to authenticated using (true);
create policy "stop_menus admin write" on public.stop_menus
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ─── DRINK ORDERS ────────────────────────────────────────────
create table public.drink_orders (
  stop_id     uuid not null references public.stops(id) on delete cascade,
  guest_id    uuid not null references public.guests(id) on delete cascade,
  option_id   uuid not null references public.stop_menus(id) on delete cascade,
  updated_at  timestamptz not null default now(),
  primary key (stop_id, guest_id)
);

alter table public.drink_orders enable row level security;

create policy "drink_orders readable" on public.drink_orders
  for select to authenticated using (true);
create policy "drink_orders write self" on public.drink_orders
  for all to authenticated
  using (guest_id = auth.uid()) with check (guest_id = auth.uid());

-- ─── FUNCTIONS ───────────────────────────────────────────────

-- Fiona can develop the album early. event_config has no client
-- policies, so this security-definer function is the only path.
create or replace function public.reveal_photos_now()
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    return false;
  end if;
  update public.event_config set reveal_at = now() where id = 1;
  return true;
end;
$$;

-- Leaderboard without exposing individual answers (RLS on
-- quiz_answers is self-only; this aggregates safely).
create or replace function public.quiz_leaderboard()
returns table (guest_id uuid, display_name text, score integer, answered integer)
language sql stable security definer set search_path = ''
as $$
  select
    g.id,
    g.display_name,
    coalesce(sum(case when a.is_correct then 1 else 0 end), 0)::integer as score,
    count(a.question_id)::integer as answered
  from public.guests g
  left join public.quiz_answers a on a.guest_id = g.id
  group by g.id, g.display_name
  order by score desc, answered desc, g.display_name asc;
$$;

grant execute on function public.reveal_photos_now() to authenticated;
grant execute on function public.quiz_leaderboard() to authenticated;

-- ─── REALTIME PUBLICATION ────────────────────────────────────
-- Each guarded: adding a table that's already a member raises
-- duplicate_object, which we swallow.
do $$ begin
  alter publication supabase_realtime add table public.broadcasts;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.field_notes;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.drink_orders;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.stops;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.locations;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.poll_votes;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.polls;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.poll_options;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.guests;
exception when duplicate_object then null; end $$;

-- ─── SEED: drink menus per stop ──────────────────────────────
-- A solid default set of options on every stop. Fiona can edit
-- per-venue later via admin (or SQL). Non-alcoholic option always.
-- Skips stops that already have a menu so re-running is safe.
insert into public.stop_menus (stop_id, position, label)
select s.id, x.pos, x.label
from public.stops s
join lateral (
  values
    (1, 'Champagne'),
    (2, 'Espresso Martini'),
    (3, 'Negroni'),
    (4, 'Glass of white'),
    (5, 'Something soft (0%)')
) as x(pos, label) on true
where not exists (
  select 1 from public.stop_menus m where m.stop_id = s.id
);
