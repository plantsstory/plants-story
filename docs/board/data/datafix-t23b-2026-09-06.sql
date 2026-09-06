begin;
-- straight quotes in the remaining string fields (notes, body_en) of 7, 52, 59
update public.cultivars set origins = replace(replace(replace(replace(origins::text, '‘', ''''), '’', ''''), '“', E'\\"'), '”', E'\\"')::jsonb, updated_at = now() where id in (7, 52, 59);
-- POWO search URLs → taxon LSID (remaining occurrences in sources / source_url)
update public.cultivars set origins = replace(origins::text, 'https://powo.science.kew.org/results?q=Anthurium%20magnificum', 'https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:85054-1')::jsonb where id = 10;
update public.cultivars set origins = replace(origins::text, 'https://powo.science.kew.org/results?q=Anthurium%20forgetii', 'https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:15285-2')::jsonb where id = 11;
update public.cultivars set origins = replace(origins::text, 'https://powo.science.kew.org/results?q=Anthurium%20regale', 'https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:85270-1')::jsonb where id = 83;
commit;
