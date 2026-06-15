-- ============================================================
-- Migration 004 — Real content (from Grace's actual invite)
--
-- Replaces ALL placeholder content (stops, polls, quiz, scavenger)
-- with the real programme. Run this whole file in the Supabase SQL
-- Editor. Safe to run before OR after 003 (003's menu seed skips
-- stops that already have menus; re-run 003's seed block after this
-- if you want drink menus attached to the new stops).
--
-- Real programme — Saturday 27 June 2026, Dublin. Dress: black.
--   2:15pm  Lunch at the house
--   5:00pm  Pen & Player
--   6:00pm  Landmark
--   9:30pm  Karaoke at Maneki
--
-- Safe to run pre-event (clears votes/answers, which don't exist yet).
-- ============================================================

-- ─── STOPS ───────────────────────────────────────────────────
delete from public.stops;  -- cascades to drink_orders / stop_menus
insert into public.stops (position, time_label, title, venue, address, drink, note) values
  (1, '14:15', 'Lunch at the House', 'The House', null, null,
     'Meet at 2:15 for lunch before the off. Dress in black — sleek and bold.'),
  (2, '17:00', 'Pen & Player',       'Pen & Player', null, null,
     'Cocktails poured for a glamorous bunch. The night begins in earnest.'),
  (3, '18:00', 'The Landmark',       'Landmark', null, null,
     'Cards on the table, a martini in hand.'),
  (4, '21:30', 'Karaoke',            'Maneki', null, null,
     'Karaoke til close. Everyone owes Grace one song.');

-- ─── POLLS ───────────────────────────────────────────────────
delete from public.polls;  -- cascades options + votes
with p as (
  insert into public.polls (title, status, position) values
    ('First cocktail at Pen & Player?', 'open', 1),
    ('Grace''s opening karaoke number?', 'open', 2),
    ('After Maneki — where to?',          'open', 3)
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
  ('After Maneki — where to?',          1, 'Push on, one more'),
  ('After Maneki — where to?',          2, 'Chipper then home'),
  ('After Maneki — where to?',          3, 'Bed, we''re angels')
) as x(title, pos, label) on x.title = p.title;

-- ─── MR & MRS QUIZ ───────────────────────────────────────────
-- Real facts first (middle name / birthplace / birthday), then
-- placeholders flagged for Mark to confirm before the night.
delete from public.quiz_questions;  -- cascades answers
insert into public.quiz_questions (position, question, options, correct_index) values
  (1, 'Mark''s middle name?',
      '["Thomas","Terence","Patrick","Edward"]'::jsonb, 1),
  (2, 'Where was Mark born?',
      '["Cork","Galway","Dublin","Limerick"]'::jsonb, 2),
  (3, 'Mark''s birthday?',
      '["6 June","16 April","11 July","28 June"]'::jsonb, 0),
  (4, 'Where did Mark first say he loved her? [Mark to confirm]',
      '["A taxi","Howth cliffs","The kitchen","Phoenix Park"]'::jsonb, 1),
  (5, 'Who said I love you first? [Mark to confirm]',
      '["Grace, obviously","Mark, obviously","It was mutual","Neither remembers"]'::jsonb, 1),
  (6, 'Mark''s nickname for Grace? [Mark to confirm]',
      '["G","Bunny","Gracie","The Boss"]'::jsonb, 3);

-- ─── SCAVENGER ───────────────────────────────────────────────
delete from public.scavenger_tasks;  -- cascades completions
insert into public.scavenger_tasks (position, task) values
  (1, 'A photo with a Garda'),
  (2, 'A toast to Grace at every stop'),
  (3, 'A stranger sings happy-marriage wishes'),
  (4, 'Something black, something borrowed'),
  (5, 'A note from Mark, read aloud'),
  (6, 'A duet at Maneki'),
  (7, 'A tip that wins the bartender''s heart'),
  (8, 'The whole squad in one photo');
