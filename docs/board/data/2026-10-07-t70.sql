-- T70 (BOARD 10-07): type locality and distribution with the same value said once in the species text.
-- Backup: 2026-10-07-t70-backup.json (ids 4 warocqueanum, 11 forgetii, 35 splendidum, 129 pallidiflorum).
begin;
update cultivars c
   set origins = (
     select jsonb_agg(
       case when o ? 'body' then
         jsonb_set(
           case when o ? 'body_en' then jsonb_set(o, '{body_en}', to_jsonb(
             regexp_replace(o->>'body_en', 'Type locality: ([^.]+)\. Distribution: \1\.', 'Type locality and distribution: \1.'))) else o end,
           '{body}', to_jsonb(regexp_replace(o->>'body', 'タイプ産地は([^。]+)。分布は\1。', 'タイプ産地・分布とも\1。')))
       else o end order by ord)
     from jsonb_array_elements(c.origins) with ordinality as e(o, ord))
 where c.id in (4, 11, 35, 129);
commit;

-- the English text of 4, 11, 35 carries "(POWO)" after the range; the board removed the （POWO） notes (10-03), so it goes too
begin;
update cultivars c
   set origins = (
     select jsonb_agg(
       case when o ? 'body_en' then jsonb_set(o, '{body_en}', to_jsonb(
         regexp_replace(o->>'body_en', 'Type locality: ([^.]+)\. Distribution: \1 \(POWO\)\.', 'Type locality and distribution: \1.')))
       else o end order by ord)
     from jsonb_array_elements(c.origins) with ordinality as e(o, ord))
 where c.id in (4, 11, 35);
commit;
