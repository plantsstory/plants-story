-- 2026-11-27 close write holes before the public announcement
--
-- Live check (2026-11-26, pg_policies on production):
--   * cultivars "Authenticated insert" checks only that the caller is logged in, and the role
--     `authenticated` holds INSERT/UPDATE on every column. Through the REST API a signed-in user
--     could set verified_at (the public 検証済 badge), put another person's user_id on a record,
--     or write origins that claim to be AI / Source A / high trust with votes already counted.
--   * cultivar_images still had three old policies next to the current ones. Policies are OR-ed,
--     so they were live:
--       "Authenticated users can upload images"  insert with any user_id
--       "Uploaders can update own images" / "Uploaders can delete own images"
--         admit anyone whose raw_user_meta_data.is_admin = 'true'. user_metadata is writable by
--         the user themselves (auth.updateUser), so any account could edit or delete every photo.
--     The current policies ("Authenticated insert images", "Owner or admin update/delete images")
--     cover the site's own flows and use is_admin() (app_metadata, not user-writable).
--
-- What this does not change: the site's own RPCs (insert, append_origin, votes, admin verify) keep
-- working; service-role writes (deploy, edge functions) and the SQL editor are not touched.

-- ---------- 1. cultivars: who owns a record, verification, and what a new record may claim ----------
create or replace function public.cultivars_write_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  -- only requests from the site (anon / signed-in users) are checked; admins, the service role
  -- (deploy, edge functions) and the SQL editor pass unchanged
  if v_role not in ('anon', 'authenticated') or public.is_admin() then
    return NEW;
  end if;

  if TG_OP = 'INSERT' then
    -- a new record always belongs to the person who sends it, and is never born verified
    NEW.user_id := auth.uid();
    NEW.verified_at := null;
    NEW.verified_by := null;
    NEW.verification_note := null;
    -- a new record's origins are the poster's own words: not AI, no source tier, no votes yet,
    -- trust no higher than the site's own forms give (50). The one AI entry the site's form makes
    -- itself, the "waiting for AI" placeholder, is kept, rebuilt from its fixed wording at trust 0.
    if jsonb_typeof(NEW.origins) = 'array' then
      NEW.origins := (
        select coalesce(jsonb_agg(
          case
            when jsonb_typeof(o) <> 'object' or o ? '_type' then o
            when jsonb_typeof(o -> 'author') = 'object'
                 and (o -> 'author' ->> 'isAI') = 'true'
                 and (o ->> 'body') in ('AIによる由来情報の生成待ちです', 'Awaiting AI-generated origin information') then
              jsonb_build_object(
                'trust', 0, 'trustClass', 'trust--low',
                'body', o ->> 'body',
                'structured', o -> 'structured',
                'sources', '[]'::jsonb,
                'author', jsonb_build_object('isAI', true, 'name', 'AI (Pending)', 'date', o -> 'author' -> 'date'),
                'votes', jsonb_build_object('agree', 0, 'disagree', 0))
            else
              (o - 'verification')
              || jsonb_build_object(
                   'source_type', 'manual',
                   'source_tier', null,
                   'verified', false,
                   'votes', jsonb_build_object('agree', 0, 'disagree', 0),
                   'author', (case when jsonb_typeof(o -> 'author') = 'object' then o -> 'author' else '{}'::jsonb end)
                             || jsonb_build_object('isAI', false))
              || case
                   when jsonb_typeof(o -> 'trust') = 'number' and (o ->> 'trust')::numeric between 0 and 50 then '{}'::jsonb
                   when jsonb_typeof(o -> 'trust') = 'number' and (o ->> 'trust')::numeric > 50 then jsonb_build_object('trust', 50, 'trustClass', 'trust--mid')
                   else jsonb_build_object('trust', 30, 'trustClass', 'trust--low')
                 end
          end
          order by ord), '[]'::jsonb)
        from jsonb_array_elements(NEW.origins) with ordinality as t(o, ord)
      );
    elsif NEW.origins is not null then
      NEW.origins := '[]'::jsonb;
    end if;
  else
    -- owner (or the site's RPCs acting for a user) may edit a record, but not hand it to someone
    -- else or mark it verified; verification goes through set_verified (admin only)
    NEW.user_id := OLD.user_id;
    NEW.verified_at := OLD.verified_at;
    NEW.verified_by := OLD.verified_by;
    NEW.verification_note := OLD.verification_note;
  end if;
  return NEW;
end;
$$;

revoke all on function public.cultivars_write_guard() from public, anon, authenticated;

drop trigger if exists cultivars_write_guard_trg on public.cultivars;
create trigger cultivars_write_guard_trg
  before insert or update on public.cultivars
  for each row execute function public.cultivars_write_guard();

-- ---------- 2. cultivar_images: remove the three old policies ----------
drop policy if exists "Authenticated users can upload images" on public.cultivar_images;
drop policy if exists "Uploaders can update own images" on public.cultivar_images;
drop policy if exists "Uploaders can delete own images" on public.cultivar_images;

-- ---------- check (read only) ----------
-- select tgname from pg_trigger where tgrelid = 'public.cultivars'::regclass and not tgisinternal;
-- select policyname, cmd from pg_policies where tablename = 'cultivar_images' order by 1;
