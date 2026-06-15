-- ============================================================
-- Migration 006 — Lunch pre-order (The House, 2:15pm)
--
-- The House serves a 3-course set lunch. For a group of ~20 the
-- restaurant needs orders in advance, so each hen picks one
-- starter + one main + one dessert, and Fiona sends the
-- consolidated order. Different shape from the cocktail single-
-- pick, hence its own tables.
--
-- Run anytime after 003 (uses is_admin patterns) and the base
-- schema. Safe to re-run.
--
-- Menu from "SAMPLE - 2026 Set Lunch Menu.pdf".
-- ============================================================

-- ─── LUNCH MENU (admin-curated; course = starter|main|dessert) ─
drop table if exists public.lunch_orders cascade;
drop table if exists public.lunch_menu cascade;

create table public.lunch_menu (
  id        uuid primary key default gen_random_uuid(),
  course    text not null check (course in ('starter','main','dessert')),
  position  integer not null,
  label     text not null,
  note      text,           -- the description line
  tag       text            -- 'VG' | 'V' | null
);
create index lunch_menu_course_idx on public.lunch_menu (course, position);

alter table public.lunch_menu enable row level security;
create policy "lunch_menu readable" on public.lunch_menu
  for select to authenticated using (true);
create policy "lunch_menu admin write" on public.lunch_menu
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ─── LUNCH ORDERS (one row per guest per course) ─────────────
create table public.lunch_orders (
  guest_id  uuid not null references public.guests(id) on delete cascade,
  course    text not null check (course in ('starter','main','dessert')),
  item_id   uuid not null references public.lunch_menu(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (guest_id, course)
);

alter table public.lunch_orders enable row level security;
create policy "lunch_orders readable" on public.lunch_orders
  for select to authenticated using (true);
create policy "lunch_orders write self" on public.lunch_orders
  for all to authenticated
  using (guest_id = auth.uid()) with check (guest_id = auth.uid());

-- realtime for live tallies in admin
do $$ begin
  alter publication supabase_realtime add table public.lunch_orders;
exception when duplicate_object then null; end $$;

-- ─── SEED: the 2026 set lunch ────────────────────────────────
insert into public.lunch_menu (course, position, label, note, tag) values
  ('starter', 1, 'Honey & Thyme Beetroot',
     'Blackberries, orange, chicory & frisée, smoked almonds, sundried tomato focaccia', null),
  ('starter', 2, 'Falafel Salad',
     'Beetroot hummus, vegan feta, tomato, black olive salad', 'VG'),
  ('starter', 3, 'Prawn Cocktail',
     'Baby gem, cucumber, spiced avocado purée, Marie Rose', null),
  ('starter', 4, 'Korean Duck Salad',
     'Pickled vegetables, crispy rice noodles, chili & mango coulis', null),

  ('main', 1, '6oz Sirloin Steak',
     'Pomme frites, onion rings, choice of pepper / Béarnaise / Café de Paris butter (fillet +€10)', null),
  ('main', 2, 'Thai Veg Curry',
     'Roasted squash, onion, pepper, baby corn, mangetout, basmati & cashews', 'VG'),
  ('main', 3, 'Coconut Curry',
     'Lime pickle potatoes, grilled pak choi, curried coconut cream, raita', null),
  ('main', 4, 'Pan Fried Cod',
     'Tomato & white bean cassoulet, celeriac & fennel salad, balsamic', null),

  ('dessert', 1, 'Chocolate Fondant',
     'Ferrero Rocher ice cream', null),
  ('dessert', 2, 'Sticky Toffee Pudding',
     'Crème anglaise & vanilla ice cream', null),
  ('dessert', 3, 'Vegan Chocolate Delice',
     'Non-dairy chocolate gelato', 'VG'),
  ('dessert', 4, 'Irish Cheese Plate',
     'Fig chutney, crackers & grapes', null);
