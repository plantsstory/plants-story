-- Board 7 (2026-10-07) T68: safe data fixes. Backup of every touched row: 2026-10-07-backup.json.
-- created_at is never touched (the new-entries list is not inflated). Guarded by the updated_at read on 10-07.
begin;

-- 108 Anthurium aff. besseae: a name whose status is open (habitats stay: the undescribed form reads the place from them)
update cultivars
   set origins = jsonb_set(origins, '{0,structured}', (origins #> '{0,structured}') || '{"species_status":"unresolved"}')
 where id = 108 and updated_at = '2026-10-02 18:53:40.846688+00';

-- 121 Anthurium sp. "Peru": open status; the place is trade information (old: no species_status, no origin_region)
update cultivars
   set origins = jsonb_set(origins, '{0,structured}', (origins #> '{0,structured}') || '{"species_status":"unresolved","origin_region":"ペルー（流通情報）"}')
 where id = 121 and updated_at = '2026-09-04 12:22:21.380587+00';

-- the 27 verified species: the date is on the 検証 line already; the note loses "（2026-10-03 点検）"
update cultivars
   set verification_note = btrim(regexp_replace(verification_note, '\s*（\d{4}-\d{2}-\d{2}\s*点検）', '', 'g'))
 where verification_note ~ '（\d{4}-\d{2}-\d{2}\s*点検）';

-- 59 antolakii, 127 queremalense, 138 villenaorum: the check date leaves the text (JP and EN)
update cultivars c
   set origins = (
     select jsonb_agg(
       case when o ? 'body' then
         jsonb_set(
           case when o ? 'body_en' then jsonb_set(o, '{body_en}', to_jsonb(
             regexp_replace(regexp_replace(o->>'body_en', '\s*\(checked \d{4}-\d{2}-\d{2}\)', '', 'g'), ',\s*checked \d{4}-\d{2}-\d{2}', '', 'g'))) else o end,
           '{body}', to_jsonb(
             regexp_replace(regexp_replace(o->>'body', '[（(]\d{4}-\d{2}-\d{2}\s*確認[)）]', '', 'g'), '、\s*\d{4}-\d{2}-\d{2}\s*確認', '', 'g')))
       else o end order by ord)
     from jsonb_array_elements(c.origins) with ordinality as e(o, ord))
 where c.id in (59, 127, 138);

commit;
