-- 11-24 owner: 「Anthurium magnificum × Anthurium magnificum は間違い」. The cross formula is taken off 'Michelle'
-- (id 144). It was written by the AI record on 11-16 from the registry's "base species: A. magnificum", which is
-- not a statement of two parents. Nothing is put in its place: the owner said what is wrong, not what is right.
-- Before: parent_a_text = parent_b_text = 'Anthurium magnificum', formula_status = 'known',
--         origins[0].structured.formula = {parentA: Anthurium magnificum, parentB: Anthurium magnificum}
-- The record's text (body) is not changed.
update public.cultivars
set parent_a_text = null,
    parent_b_text = null,
    formula_status = null,
    origins = (select jsonb_agg(case when o ? 'structured' then o #- '{structured,formula}' else o end) from jsonb_array_elements(origins) o)
where id = 144 and parent_a_text = 'Anthurium magnificum' and parent_b_text = 'Anthurium magnificum';

select id, cultivar_name, type, parent_a_text, parent_b_text, formula_status, origins->0->'structured' s from public.cultivars where id = 144;
