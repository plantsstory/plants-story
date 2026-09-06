begin;
-- Image rows are looked up by the display name (the " [Seedling]" suffix stripped) everywhere in the app
update public.cultivar_images set cultivar_name = replace(cultivar_name, ' [Seedling]', '') where cultivar_name like '% [Seedling]';
commit;
