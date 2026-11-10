-- Board 15 (2026-11-10) T9: two data corrections, both checked against the cited source.
-- Before values are kept in docs/board/2026-11-10.md §4.

-- 140 Anthurium papillilaminum 'Fort Sherman' (AI-written record; the entry is the owner's).
-- The source (Exotica Esoterica, J. Vannini) calls it a wild-origin, Panamá Canal-adjacent plant he has worked
-- with for decades; "the two locality types" in the article is said of two seedling batches, not of this plant.
update public.cultivars
set origins = jsonb_set(jsonb_set(jsonb_set(origins,
      '{0,body}', to_jsonb($jp$Jay Vannini が長年維持している、パナマ運河周辺の野生由来の Anthurium papillilaminum の 1 株。同じく運河周辺に由来する 'Ralph Lynam' とともに交配親に使われている（例: warocqueanum との正逆交配、'Curandero'）。$jp$::text)),
      '{0,body_en}', to_jsonb($en$A wild-origin plant of Anthurium papillilaminum from the Panama Canal area, kept by Jay Vannini for decades. Used as a breeding parent together with 'Ralph Lynam', another plant from near the Canal (e.g. reciprocal crosses with warocqueanum, 'Curandero').$en$::text)),
      '{0,structured,acquisition}', '"wild"'::jsonb)
where id = 140 and origins->0->>'provenance' = 'ai';

-- 8 Anthurium 'Queen of Hearts': the contributor's record says it is *likely* a somaclonal variant of
-- 'Ace of Spades'; the label showed 'Ace of Spades' as its source plant without that reservation.
update public.cultivars
set tags = array_append(coalesce(tags, '{}'::text[]), 'selection_unconfirmed')
where id = 8 and not ('selection_unconfirmed' = any(coalesce(tags, '{}'::text[])));

select id, tags, origins->0->>'body' as body, origins->0->'structured'->>'acquisition' as acquisition from public.cultivars where id in (8, 140) order by id;
