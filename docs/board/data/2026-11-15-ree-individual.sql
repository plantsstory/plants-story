-- 2026-11-15 (owner): Anthurium papillilaminum 'Ree garden''s' is one plant of a species, so it is an individual of
-- papillilaminum (id 32), not a Clone of its own. Before: tags null, selected_from_id null. Name and records unchanged.
update public.cultivars set tags = array['individual'], selected_from_id = 32 where id = 142 and selected_from_id is null;
select id, cultivar_name, type, tags, selected_from_id from public.cultivars where id = 142;
