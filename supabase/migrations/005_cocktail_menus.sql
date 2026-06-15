-- ============================================================
-- Migration 005 — Real menus per stop
--
-- Authoritative source for each stop's orderable list (what hens
-- tap in the 15-min warning; what Fiona pre-orders).
-- Self-contained + idempotent: wipes stop_menus and re-inserts.
--
-- RUN ORDER: after 004 (real stops) and 003 (stop_menus table incl.
-- the `note` column). Overrides 003's generic seed.
--
-- Mapping (evidence-based; confirmed with Tim):
--   The House     = lunch venue → light drinks here; FOOD pre-order
--                   is a separate feature (the set-lunch PDF).
--   Pen & Player  = theatrical "Repertoire & Review" cocktails.
--   The Landmark  = "Trace of the Rebel" cocktail menu.
--   Maneki        = placeholder, still TK.
-- ============================================================

delete from public.stop_menus;

-- ─── PEN & PLAYER (real — theatrical signature list) ─────────
insert into public.stop_menus (stop_id, position, label, note)
select s.id, x.pos, x.label, x.note
from public.stops s
join (values
  (1,  'Repertoire & Review',        'light, fruity, bitter'),
  (2,  'Behind the Bars',            'strong, deep, rich'),
  (3,  'The Literary Agent',         'sweet & sour, rich, spiced'),
  (4,  'The Green Fairy Café',       'sweet, deep, complex'),
  (5,  'Cabaret Highlight',          'refreshing, complex, fruity'),
  (6,  'Sonnet & Signature',         'fruity, light, sour'),
  (7,  'A Word of Whimsy',           'flowery, fruity, sour'),
  (8,  'The Scene Change',           'citrus, boozy, fizzy'),
  (9,  'The Bard''s Bibliography',   'silky, deep, smoky'),
  (10, 'Moonlighter',                'herbal, sour'),
  (11, 'A Performance in the Round', 'strong, sweet, spiced'),
  (12, 'Botanical Spotlight',        'refreshing, sweet, acidic'),
  (13, 'Ink Drop',                   'peated, complex, bitter'),
  (14, 'The Beauty & the Beast',     'complex, deep, aromatic'),
  (15, 'Magic Glass',                'no alcohol · fruity, light'),
  (16, 'A Page''s Turn & Twist',     'no alcohol · citrus, fizzy')
) as x(pos, label, note) on true
where s.venue = 'Pen & Player';

-- ─── THE LANDMARK (real) ─────────────────────────────────────
insert into public.stop_menus (stop_id, position, label, note)
select s.id, x.pos, x.label, x.note
from public.stops s
join (values
  (1,  'Trace of the Rebel',  'bourbon, red ale, apple'),
  (2,  'Dockland Drift',      'rums, Hennessy, tropical'),
  (3,  'Mile High',           'Jameson, apple, ginger'),
  (4,  'Ghost in the Glass',  'tequila, hot honey, citrus'),
  (5,  'Victoria Secret',     'Malibu, raspberry, mint'),
  (6,  'Irish Maid',          'Teeling, sour apple, soda'),
  (7,  'Peach Please',        'vodka, peach, rose, lemonade'),
  (8,  'Midnight Seville',    'clarified chocolate Negroni'),
  (9,  'Pornstar Martini',    null),
  (10, 'Espresso Martini',    null),
  (11, 'Aperol Spritz',       null),
  (12, 'Margarita',           null),
  (13, 'Mojito',              null),
  (14, 'Cosmopolitan',        null),
  (15, 'Something soft (0%)', null)
) as x(pos, label, note) on true
where s.venue = 'Landmark';

-- ─── MANEKI (placeholder — TK real menu) ─────────────────────
insert into public.stop_menus (stop_id, position, label, note)
select s.id, x.pos, x.label, x.note
from public.stops s
join (values
  (1, 'Sake bomb',           null),
  (2, 'Lychee Martini',      null),
  (3, 'Japanese Highball',   null),
  (4, 'Aperol Spritz',       null),
  (5, 'Espresso Martini',    null),
  (6, 'Something soft (0%)', null)
) as x(pos, label, note) on true
where s.venue = 'Maneki';

-- ─── THE HOUSE (lunch — drinks only; food handled separately) ─
insert into public.stop_menus (stop_id, position, label, note)
select s.id, x.pos, x.label, x.note
from public.stops s
join (values
  (1, 'Champagne',           null),
  (2, 'Aperol Spritz',       null),
  (3, 'Glass of red / white', null),
  (4, 'Something soft (0%)', null)
) as x(pos, label, note) on true
where s.venue = 'The House';
