-- board 17 T224 (11-19): data and ledger
-- 'Queen of Hearts'(8): 10-07b decided to drop the selected-from link and its tags; it was never applied.
-- Before: selected_from_id = 7, tags = {tc_origin,selection_unconfirmed}
update public.cultivars set selected_from_id = null, tags = null
where id = 8 and selected_from_id = 7;
-- antolakii(59) is NOT changed: it already reads 'Anthurium sp. "antolakii"' through species_status; setting
-- species_qualifier = 'sp' alone would make it read 'Anthurium antolakii' (checked on 11-19).
-- 142 'Ree garden''s': the second record (the same text, AI-checked) is folded on the page, not deleted (pages.js).
select id, cultivar_name, selected_from_id, tags from public.cultivars where id = 8;
