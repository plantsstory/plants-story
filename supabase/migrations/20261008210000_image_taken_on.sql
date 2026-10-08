-- Board 10 T129: the date a photo was taken, and the entry it belongs to, as columns.
-- taken_on comes only from a caption that begins exactly with 「撮影 YYYY.MM.DD」 (what the photo sheet writes from
-- the photo's own EXIF or the uploader's input). The caption itself is never changed; no date is guessed.
-- cultivar_id is set only when the photo's name matches exactly one entry (the name, or the name + ' [Seedling]').
alter table public.cultivar_images add column if not exists taken_on date;
alter table public.cultivar_images add column if not exists cultivar_id bigint references public.cultivars(id) on delete set null;
create index if not exists cultivar_images_cultivar_id_idx on public.cultivar_images (cultivar_id);

create or replace function public.image_taken_on_from_caption(p_caption text)
returns date language plpgsql immutable as $$
declare m text[];
begin
  m := regexp_match(coalesce(p_caption, ''), '^撮影 (\d{4})\.(\d{2})\.(\d{2})');
  if m is null then return null; end if;
  begin
    return make_date(m[1]::int, m[2]::int, m[3]::int);
  exception when others then return null;
  end;
end $$;

create or replace function public.image_fill_columns()
returns trigger language plpgsql security definer set search_path = public as $$
declare ids bigint[];
begin
  if new.taken_on is null or (tg_op = 'UPDATE' and new.caption is distinct from old.caption and old.taken_on is not distinct from public.image_taken_on_from_caption(old.caption)) then
    new.taken_on := coalesce(public.image_taken_on_from_caption(new.caption), case when tg_op = 'UPDATE' and new.caption is distinct from old.caption then null else new.taken_on end);
  end if;
  if new.taken_on is not null and (new.taken_on > current_date + 1 or new.taken_on < date '1900-01-01') then new.taken_on := null; end if;
  if new.cultivar_id is null then
    select array_agg(c.id) into ids from public.cultivars c
      where c.cultivar_name = new.cultivar_name or c.cultivar_name = new.cultivar_name || ' [Seedling]';
    if coalesce(array_length(ids, 1), 0) = 1 then new.cultivar_id := ids[1]; end if;
  end if;
  return new;
end $$;

drop trigger if exists image_fill_columns on public.cultivar_images;
create trigger image_fill_columns before insert or update of caption, cultivar_name on public.cultivar_images
  for each row execute function public.image_fill_columns();

-- the photos already there
update public.cultivar_images i set taken_on = public.image_taken_on_from_caption(i.caption)
  where i.taken_on is null and public.image_taken_on_from_caption(i.caption) is not null;
update public.cultivar_images i set cultivar_id = s.id
  from (select i2.id img, min(c.id) id, count(*) n from public.cultivar_images i2
          join public.cultivars c on c.cultivar_name = i2.cultivar_name or c.cultivar_name = i2.cultivar_name || ' [Seedling]'
          group by i2.id) s
  where s.img = i.id and s.n = 1 and i.cultivar_id is null;
