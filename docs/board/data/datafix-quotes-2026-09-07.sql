begin;
-- Owner decision 2026-09-07: numbered individuals use single quotes ('HR1'), like named ones.
update public.cultivars
   set cultivar_name = replace(replace(cultivar_name, '"HR1"', '''HR1'''), '"HR2"', '''HR2'''),
       parent_a_text = replace(coalesce(parent_a_text, ''), '"HR1"', '''HR1'''),
       parent_b_text = replace(coalesce(parent_b_text, ''), '"HR2"', '''HR2'''),
       origins = replace(replace(origins::text, '\"HR1\"', '''HR1'''), '\"HR2\"', '''HR2''')::jsonb,
       updated_at = now()
 where id = 89;
update public.cultivar_images
   set cultivar_name = replace(replace(cultivar_name, '"HR1"', '''HR1'''), '"HR2"', '''HR2''')
 where cultivar_name like '%HR1%';
commit;
