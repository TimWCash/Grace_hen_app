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
  reveal_at       timestamptz not null default '2026-06-28T10:00:00+01:00',
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
  correct_index   integer not null,
  category        text not null default 'mr_mrs'  -- 'mr_mrs' | 'guess_who'
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
  select id, position, question, options, category from public.quiz_questions
  order by category, position;
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

-- Real programme — Saturday 27 June 2026, Dublin.
insert into public.stops (position, time_label, title, venue, address, drink, note) values
  (1, '14:15', 'Lunch at House', 'House', null, null, 'Meet at 2:15 for lunch before the off.'),
  (2, '17:00', 'Pen & Player',       'Pen & Player', null, null, 'Cocktails poured for a glamorous bunch. The night begins in earnest.'),
  (3, '18:00', 'The Landmark',       'Landmark', null, null, 'Cards on the table, a martini in hand.'),
  (4, '21:30', 'Karaoke',            'Maneki', null, null, 'Karaoke til close. Everyone owes Grace one song.');

with p as (
  insert into public.polls (title, status, position) values
    ('First cocktail at Pen & Player?', 'open',   1),
    ('Grace''s opening karaoke number?', 'open',   2),
    ('After Maneki — where to?',         'open',   3)
  returning id, title
)
insert into public.poll_options (poll_id, position, label)
select p.id, x.pos, x.label
from p
join (values
  ('First cocktail at Pen & Player?', 1, 'Espresso Martini'),
  ('First cocktail at Pen & Player?', 2, 'Negroni'),
  ('First cocktail at Pen & Player?', 3, 'Champagne, obviously'),
  ('Grace''s opening karaoke number?', 1, 'Total Eclipse of the Heart'),
  ('Grace''s opening karaoke number?', 2, 'Mr Brightside'),
  ('Grace''s opening karaoke number?', 3, 'Something by Beyoncé'),
  ('After Maneki — where to?',         1, 'Push on, one more'),
  ('After Maneki — where to?',         2, 'Chipper then home'),
  ('After Maneki — where to?',         3, 'Bed, we''re angels')
) as x(title, pos, label) on x.title = p.title;

-- Mr & Mrs — a few seeded with real facts about Mark (middle name,
-- birthplace, birthday from his details). The rest are placeholders
-- for Mark to answer; Fiona/Tim can edit before the night.
insert into public.quiz_questions (position, question, options, correct_index) values
  (1, 'Mark''s middle name?',
      '["Thomas","Terence","Patrick","Edward"]'::jsonb, 1),
  (2, 'Where was Mark born?',
      '["Cork","Galway","Dublin","Limerick"]'::jsonb, 2),
  (3, 'Mark''s birthday?',
      '["6 June","16 April","11 July","28 June"]'::jsonb, 0),
  (4, 'What was Mark wearing when he proposed?',
      '["A tuxedo","A Bulls sweatshirt","A shirt and tie","His gym kit"]'::jsonb, 1),
  (5, 'Where did Mark first say he loved her? [Mark to confirm]',
      '["A taxi","Howth cliffs","The kitchen","Phoenix Park"]'::jsonb, 1),
  (6, 'Who said I love you first? [Mark to confirm]',
      '["Grace, obviously","Mark, obviously","It was mutual","Neither remembers"]'::jsonb, 1),
  (7, 'Mark''s nickname for Grace? [Mark to confirm]',
      '["G","Bunny","Gracie","The Boss"]'::jsonb, 3);

-- Guess Who · Bride or Groom — options [Grace, Mark]; 0 = Grace, 1 = Mark.
insert into public.quiz_questions (position, category, question, options, correct_index) values
  (1,  'guess_who', 'Who paid for the first date?', '["Grace","Mark"]'::jsonb, 1),
  (2,  'guess_who', 'Who''s the better dancer?',    '["Grace","Mark"]'::jsonb, 1),
  (3,  'guess_who', 'Who made the first move?',     '["Grace","Mark"]'::jsonb, 1),
  (4,  'guess_who', 'Who said I love you first?',   '["Grace","Mark"]'::jsonb, 1),
  (5,  'guess_who', 'Who''s the better cook?',      '["Grace","Mark"]'::jsonb, 1),
  (6,  'guess_who', 'Who''s more spontaneous?',     '["Grace","Mark"]'::jsonb, 1),
  (7,  'guess_who', 'Who''s the messy one?',        '["Grace","Mark"]'::jsonb, 0),
  (8,  'guess_who', 'Who''s the better dresser?',   '["Grace","Mark"]'::jsonb, 0),
  (9,  'guess_who', 'Who''s more romantic?',        '["Grace","Mark"]'::jsonb, 1),
  (10, 'guess_who', 'Who''s the better driver?',    '["Grace","Mark"]'::jsonb, 1),
  (11, 'guess_who', 'Who''s the morning person?',   '["Grace","Mark"]'::jsonb, 0),
  (12, 'guess_who', 'Who''s the big spender?',      '["Grace","Mark"]'::jsonb, 0),
  (13, 'guess_who', 'Who takes longer to get ready?', '["Grace","Mark"]'::jsonb, 0),
  (14, 'guess_who', 'Who takes longer showers?',    '["Grace","Mark"]'::jsonb, 1),
  (15, 'guess_who', 'Who''ll cry on the big day?',   '["Grace","Mark"]'::jsonb, 0),
  (16, 'guess_who', 'Who''s most likely to be late?', '["Grace","Mark"]'::jsonb, 1),
  (17, 'guess_who', 'Who''s more patient?',          '["Grace","Mark"]'::jsonb, 1);

insert into public.scavenger_tasks (position, task) values
  (1, 'A photo with a Garda'),
  (2, 'A toast to Grace at every stop'),
  (3, 'A stranger sings happy-marriage wishes'),
  (4, 'Something black, something borrowed'),
  (5, 'A note from Mark, read aloud'),
  (6, 'A duet at Maneki'),
  (7, 'A tip that wins the bartender''s heart'),
  (8, 'The whole squad in one photo');
