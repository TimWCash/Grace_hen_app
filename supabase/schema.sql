-- ============================================================
-- Grace's Hen — Dublin · 28 June 2026
-- Single-event database, Anonymous Auth model.
--
-- HOW IT WORKS
-- 1. Guest enters passcode + name on the cover screen.
-- 2. App calls verify_passcode(); if valid, signs in anonymously.
-- 3. App inserts a row in `guests` keyed by auth.uid().
-- 4. RLS policies allow signed-in guests to read/write event data.
-- 5. Photos stay hidden until reveal_at (server-side check).
-- 6. Quiz correctness is computed server-side so answers can't leak.
-- ============================================================

-- Reset (safe re-run)
drop function if exists public.verify_passcode(text) cascade;
drop function if exists public.check_quiz_answer(uuid, integer) cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.set_admin(text) cascade;
drop function if exists public.photos_revealed() cascade;

drop table if exists public.scavenger_completions cascade;
drop table if exists public.scavenger_tasks       cascade;
drop table if exists public.quiz_answers          cascade;
drop table if exists public.quiz_questions        cascade;
drop table if exists public.locations             cascade;
drop table if exists public.poll_votes            cascade;
drop table if exists public.poll_options          cascade;
drop table if exists public.polls                 cascade;
drop table if exists public.photos                cascade;
drop table if exists public.stops                 cascade;
drop table if exists public.guests                cascade;
drop table if exists public.event_config          cascade;

-- ============================================================
-- TABLES
-- ============================================================

create table public.event_config (
  id              integer primary key default 1,
  passcode        text not null,
  admin_pin       text not null,
  reveal_at       timestamptz not null default '2026-07-11T14:00:00+01:00',
  constraint singleton check (id = 1)
);

create table public.guests (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text not null check (length(display_name) between 1 and 40),
  is_admin        boolean not null default false,
  is_bride        boolean not null default false,
  joined_at       timestamptz not null default now()
);
create index guests_joined_idx on public.guests (joined_at);

create table public.stops (
  id              uuid primary key default gen_random_uuid(),
  position        integer not null,
  time_label      text not null,
  title           text not null,
  venue           text,
  address         text,
  drink           text,
  note            text,
  status          text not null default 'planned'
                  check (status in ('planned','here','done','skipped')),
  updated_at      timestamptz not null default now()
);
create index stops_position_idx on public.stops (position);

create table public.photos (
  id              uuid primary key default gen_random_uuid(),
  guest_id        uuid references public.guests(id) on delete set null,
  storage_path    text not null,
  caption         text,
  taken_at        timestamptz not null default now()
);
create index photos_taken_idx on public.photos (taken_at desc);

create table public.polls (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  status          text not null default 'open' check (status in ('open','closed')),
  position        integer not null default 0,
  created_at      timestamptz not null default now()
);

create table public.poll_options (
  id              uuid primary key default gen_random_uuid(),
  poll_id         uuid not null references public.polls(id) on delete cascade,
  position        integer not null,
  label           text not null
);

create table public.poll_votes (
  poll_id         uuid not null references public.polls(id) on delete cascade,
  guest_id        uuid not null references public.guests(id) on delete cascade,
  option_id       uuid not null references public.poll_options(id) on delete cascade,
  voted_at        timestamptz not null default now(),
  primary key (poll_id, guest_id)
);

create table public.locations (
  guest_id        uuid primary key references public.guests(id) on delete cascade,
  lat             double precision not null,
  lng             double precision not null,
  accuracy_m      double precision,
  updated_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '8 hours')
);

create table public.quiz_questions (
  id              uuid primary key default gen_random_uuid(),
  position        integer not null,
  question        text not null,
  options         jsonb not null,
  correct_index   integer not null
);

create table public.quiz_answers (
  question_id     uuid not null references public.quiz_questions(id) on delete cascade,
  guest_id        uuid not null references public.guests(id) on delete cascade,
  chosen_index    integer not null,
  is_correct      boolean not null,
  answered_at     timestamptz not null default now(),
  primary key (question_id, guest_id)
);

create table public.scavenger_tasks (
  id              uuid primary key default gen_random_uuid(),
  position        integer not null,
  task            text not null
);

create table public.scavenger_completions (
  task_id         uuid not null references public.scavenger_tasks(id) on delete cascade,
  guest_id        uuid not null references public.guests(id) on delete cascade,
  completed_at    timestamptz not null default now(),
  primary key (task_id, guest_id)
);

-- ============================================================
-- HELPERS (security definer)
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select is_admin from public.guests where id = auth.uid()), false);
$$;

create or replace function public.photos_revealed()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select now() >= reveal_at from public.event_config where id = 1), false);
$$;

create or replace function public.verify_passcode(p text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.event_config where id = 1 and passcode = p);
$$;

create or replace function public.set_admin(pin text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  ok boolean;
begin
  select exists (
    select 1 from public.event_config where id = 1 and admin_pin = pin
  ) into ok;
  if ok and auth.uid() is not null then
    update public.guests set is_admin = true where id = auth.uid();
  end if;
  return ok;
end;
$$;

create or replace function public.check_quiz_answer(q uuid, chosen integer)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  correct integer;
  is_right boolean;
begin
  select correct_index into correct from public.quiz_questions where id = q;
  if correct is null then return false; end if;
  is_right := (correct = chosen);
  insert into public.quiz_answers (question_id, guest_id, chosen_index, is_correct)
  values (q, auth.uid(), chosen, is_right)
  on conflict (question_id, guest_id)
    do update set chosen_index = excluded.chosen_index,
                  is_correct = excluded.is_correct,
                  answered_at = now();
  return is_right;
end;
$$;

grant execute on function public.verify_passcode(text) to anon, authenticated;
grant execute on function public.set_admin(text)       to authenticated;
grant execute on function public.check_quiz_answer(uuid, integer) to authenticated;
grant execute on function public.is_admin()            to anon, authenticated;
grant execute on function public.photos_revealed()     to anon, authenticated;

-- ============================================================
-- RLS
-- ============================================================
alter table public.event_config           enable row level security;
alter table public.guests                 enable row level security;
alter table public.stops                  enable row level security;
alter table public.photos                 enable row level security;
alter table public.polls                  enable row level security;
alter table public.poll_options           enable row level security;
alter table public.poll_votes             enable row level security;
alter table public.locations              enable row level security;
alter table public.quiz_questions         enable row level security;
alter table public.quiz_answers           enable row level security;
alter table public.scavenger_tasks        enable row level security;
alter table public.scavenger_completions  enable row level security;

-- event_config: never directly readable; only via functions
-- (no policies = nothing visible to anon/authenticated)

-- guests: all signed-in can see roster; insert/update self
create policy "guests readable to signed-in"  on public.guests
  for select to authenticated using (true);
create policy "guests insert self"            on public.guests
  for insert to authenticated with check (id = auth.uid());
create policy "guests update self"            on public.guests
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "admin can update any guest"    on public.guests
  for update to authenticated using (public.is_admin()) with check (true);

-- stops: anyone signed-in can read; admin can write
create policy "stops readable" on public.stops
  for select to authenticated using (true);
create policy "stops admin write" on public.stops
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- photos: insert by signed-in guests; read only after reveal (or admin)
create policy "photos insert by guest" on public.photos
  for insert to authenticated with check (guest_id = auth.uid());
create policy "photos visible after reveal" on public.photos
  for select to authenticated using (public.photos_revealed() or public.is_admin());

-- polls + options: read for signed-in; write for admin
create policy "polls readable"        on public.polls         for select to authenticated using (true);
create policy "poll_options readable" on public.poll_options  for select to authenticated using (true);
create policy "polls admin write"        on public.polls
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "poll_options admin write" on public.poll_options
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- poll_votes: read all; insert/update own
create policy "poll_votes readable"    on public.poll_votes for select to authenticated using (true);
create policy "poll_votes insert self" on public.poll_votes
  for insert to authenticated with check (guest_id = auth.uid());
create policy "poll_votes update self" on public.poll_votes
  for update to authenticated using (guest_id = auth.uid()) with check (guest_id = auth.uid());
create policy "poll_votes delete self" on public.poll_votes
  for delete to authenticated using (guest_id = auth.uid());

-- locations: read all (signed-in); upsert own
create policy "locations readable"    on public.locations for select to authenticated using (true);
create policy "locations upsert self" on public.locations
  for all to authenticated using (guest_id = auth.uid()) with check (guest_id = auth.uid());

-- quiz: questions readable WITHOUT correct_index via a view
create policy "quiz_questions readable" on public.quiz_questions
  for select to authenticated using (true);
create policy "quiz answers readable to self" on public.quiz_answers
  for select to authenticated using (guest_id = auth.uid() or public.is_admin());

-- scavenger
create policy "scavenger tasks readable" on public.scavenger_tasks
  for select to authenticated using (true);
create policy "scavenger completions readable" on public.scavenger_completions
  for select to authenticated using (true);
create policy "scavenger completions write self" on public.scavenger_completions
  for all to authenticated using (guest_id = auth.uid()) with check (guest_id = auth.uid());

-- View that hides correct_index from clients
create or replace view public.quiz_public as
  select id, position, question, options from public.quiz_questions
  order by position;
grant select on public.quiz_public to authenticated;

-- ============================================================
-- STORAGE — photos bucket
-- ============================================================
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

-- Upload: any signed-in guest can put into 'photos/<uid>/...'
create policy "photos upload own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read: only after reveal (or admin)
create policy "photos read after reveal" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos' and (public.photos_revealed() or public.is_admin())
  );

-- ============================================================
-- SEED DATA
-- ============================================================

insert into public.event_config (id, passcode, admin_pin) values
  (1, 'bellinis', '6128')
on conflict (id) do update
  set passcode = excluded.passcode, admin_pin = excluded.admin_pin;

insert into public.stops (position, time_label, title, venue, address, drink, note) values
  (1, '17:00', 'The First Toast',   'The Horseshoe Bar',     'The Shelbourne · 27 St Stephen''s Green', 'Champagne · house cocktail',  'We start where Dublin always has. Sashes on, photos by the harp.'),
  (2, '18:30', 'The Hidden One',    '9 Below',               'St Stephen''s Green Hibernian Club',      'Signature: the Hibernian',    'Down the stairs, around the corner. Reservation under Canning.'),
  (3, '20:00', 'The Speakeasy',     'Vintage Cocktail Club', '15 Crown Alley, Temple Bar',              'Negroni flight',              'Ring the bell. Loud is encouraged.'),
  (4, '21:30', 'Poitín & Pride',    'Bar 1661',              '1 – 5 Green Street',                       'Belfast Coffee · Bán Poitín', 'Best bar in Ireland three years running. Order whatever the bartender says.'),
  (5, '23:00', 'Powder & Periwigs', 'Peruke & Periwig',      '31 Dawson Street',                         'Last martinis · gold-rimmed', 'Dressy, dim, and dangerous. The crawl''s last act.'),
  (6, '01:00', 'Last Orders',       'The Blind Pig',         'Drury Buildings basement',                 'Anything left',               'Optional. Mostly for the brave.');

with p as (
  insert into public.polls (title, status, position) values
    ('Where to after dinner?', 'open',   1),
    ('Karaoke encore?',        'open',   2),
    ('Saturday breakfast',     'closed', 3)
  returning id, title
)
insert into public.poll_options (poll_id, position, label)
select p.id, x.pos, x.label
from p
join (values
  ('Where to after dinner?', 1, 'Peruke & Periwig'),
  ('Where to after dinner?', 2, 'Vintage Cocktail Club'),
  ('Where to after dinner?', 3, 'Home, virtuous'),
  ('Karaoke encore?',        1, 'Wonderwall, again'),
  ('Karaoke encore?',        2, 'Riverdance — choreographed'),
  ('Karaoke encore?',        3, 'Mark''s love song (Grace sings)'),
  ('Saturday breakfast',     1, 'Brother Hubbard'),
  ('Saturday breakfast',     2, 'Room service')
) as x(title, pos, label) on x.title = p.title;

insert into public.quiz_questions (position, question, options, correct_index) values
  (1, 'Where did Mark first say he loved her?',
      '["A taxi","Howth cliffs","The kitchen","Phoenix Park"]'::jsonb, 1),
  (2, 'Mark''s most-used phrase in the morning?',
      '["I''ll do the coffee","Five more minutes","Did the dog eat?","What''s the plan?"]'::jsonb, 1),
  (3, 'Their first holiday together?',
      '["Lisbon","Marrakech","Sorrento","Edinburgh"]'::jsonb, 2),
  (4, 'Who said I love you first?',
      '["Grace, obviously","Mark, obviously","It was mutual","Neither remembers"]'::jsonb, 1),
  (5, 'Mark''s nickname for Grace?',
      '["G","Bunny","Gracie","The Boss"]'::jsonb, 3);

insert into public.scavenger_tasks (position, task) values
  (1, 'A photo with a Garda'),
  (2, 'A pint of Guinness raised to Grace'),
  (3, 'A stranger singing for the bride'),
  (4, 'Something blue, something borrowed'),
  (5, 'A note from Mark, read aloud'),
  (6, 'A waltz on Grafton Street'),
  (7, 'A tip from the bartender'),
  (8, 'The view from the top floor');
