-- ============================================================
-- Migration 008 — "Guess Who: Bride or Groom" round
--
-- Adds a `category` to quiz_questions so the Salon shows two
-- labelled rounds: "Mr & Mrs" (existing) and "Guess Who".
-- Idempotent — safe to re-run.
--
-- Paste into the Supabase SQL Editor and Run.
-- ============================================================

alter table public.quiz_questions
  add column if not exists category text not null default 'mr_mrs';

-- quiz_public now exposes category (clients group questions by it).
create or replace view public.quiz_public as
  select id, position, question, options, category
  from public.quiz_questions
  order by category, position;
grant select on public.quiz_public to authenticated;

-- Re-seed the Guess Who round. Options are [Grace, Mark]; correct_index
-- 0 = Grace, 1 = Mark.
delete from public.quiz_questions where category = 'guess_who';
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
  (12, 'guess_who', 'Who''s the big spender?',      '["Grace","Mark"]'::jsonb, 0);
