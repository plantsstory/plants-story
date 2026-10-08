-- 2026-10-08: personal data out of public reach.
-- - IP addresses (created_ip, origin_added_ip) were readable with the public key: no longer collected (getUserIp is
--   gone) and now erased; a trigger keeps them empty.
-- - The old anonymous edit by key (update_with_edit_key) is retired: the hashes were readable with the public key,
--   which made a key guessable offline; every edit needs a login now (update_with_edit_key_hash checks the owner).
begin;
update public.cultivars set created_ip = null, origin_added_ip = null, edit_key_hash = null
 where created_ip is not null or origin_added_ip is not null or edit_key_hash is not null;
update public.cultivar_images set created_ip = null where created_ip is not null;

create or replace function public.no_ip_columns()
returns trigger language plpgsql as $$
begin
  if TG_TABLE_NAME = 'cultivars' then
    NEW.created_ip := null; NEW.origin_added_ip := null; NEW.edit_key_hash := null;
  else
    NEW.created_ip := null;
  end if;
  return NEW;
end;
$$;
drop trigger if exists cultivars_no_ip_trg on public.cultivars;
create trigger cultivars_no_ip_trg before insert or update on public.cultivars for each row execute function public.no_ip_columns();
drop trigger if exists cultivar_images_no_ip_trg on public.cultivar_images;
create trigger cultivar_images_no_ip_trg before insert or update on public.cultivar_images for each row execute function public.no_ip_columns();

revoke execute on function public.update_with_edit_key(text, text, text, text, text, jsonb) from public, anon, authenticated;
commit;
