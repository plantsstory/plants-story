-- 2026-11-27 AI translation of contributors' words, shown only after the owner approves it
-- Owner: 「由来などを英訳する時は直訳ではなく、AIで綺麗な文に…逆に英語で投稿された場合も。これらは投稿後、定期的な
-- チェックで私にこれでいいか確認があってから反映。反映までは反映中として中途半端な分は作らない。日本語で名詞や人名を
-- カタカナにしてしまわないように」
--
-- How it works
--   1. When a record's words are saved (insert or edit of cultivars.origins), the trigger queues each person's body
--      that has no approved translation yet (origin_translations, status 'queued'). Database / AI records are
--      bilingual already and are not queued.
--   2. Every 30 minutes the edge function translate-origin (switched off until TRANSLATE_ENABLED = on) drafts the
--      translations with the AI and checks the names (status 'drafted', flags).
--   3. The daily admin mail (admin-digest, 08:00 JST) counts the drafts; the owner reads them in the admin
--      (翻訳の確認) and approves, edits, asks for a redo, or keeps the original (RPC decide_translation).
--   4. Only an approved translation is written into the record (origin.tr.en / origin.tr.ja = { text, from, at,
--      model }). The site shows it while `from` is still the body word for word; until then the other language
--      shows 「翻訳を反映中」 (wireframe/js/record-text.js).
-- Users cannot write origin.tr themselves: cultivars_write_guard drops it from what the site sends, and keeps the
-- approved one on an edit that leaves the words unchanged.

create table if not exists public.origin_translations (
  id bigserial primary key,
  cultivar_id bigint not null references public.cultivars(id) on delete cascade,
  cultivar_name text not null,
  src_text text not null,
  src_lang text check (src_lang in ('ja', 'en')),
  dst_lang text check (dst_lang in ('ja', 'en')),
  draft_text text,
  final_text text,
  flags jsonb not null default '[]'::jsonb,
  hint text,
  model text,
  status text not null default 'queued' check (status in ('queued', 'drafted', 'approved', 'kept', 'stale', 'failed')),
  attempts int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  drafted_at timestamptz,
  decided_at timestamptz
);
create index if not exists origin_translations_status_idx on public.origin_translations (status, created_at);
create index if not exists origin_translations_cultivar_idx on public.origin_translations (cultivar_id);

alter table public.origin_translations enable row level security;
revoke all on public.origin_translations from anon, authenticated;
grant select on public.origin_translations to authenticated;
drop policy if exists "Admin reads translations" on public.origin_translations;
create policy "Admin reads translations" on public.origin_translations for select to authenticated using (public.is_admin());

-- the text the site shows for a record by a person (same test as record-text.js isPersonRecord)
create or replace function public.origin_is_person(o jsonb)
returns boolean language sql immutable as $$
  select jsonb_typeof(o) = 'object' and o->>'_type' is null
     and coalesce(o->>'source_type', '') <> 'ipni_powo'
     and (o->>'source_type' = 'manual' or (o->'author'->>'isAI') = 'false')
$$;

-- does a record's body still need a translation?
--   a generated body (from the fields) needs one only when a field value is written in Japanese; English is made
--   from the fields on the page. A numbered plant with no note has the site's own English already.
create or replace function public.origin_needs_translation(o jsonb)
returns boolean language plpgsql immutable as $$
declare
  b text := coalesce(o->>'body', '');
  s jsonb := coalesce(o->'structured', '{}'::jsonb);
  fields text;
begin
  if not public.origin_is_person(o) or length(btrim(b)) < 2 then return false; end if;
  if b in ('AIによる由来情報の生成待ちです', 'Awaiting AI-generated origin information') then return false; end if;
  -- an approved translation (or the owner's 「原文のまま」) of these very words
  if exists (select 1 from jsonb_each(coalesce(o->'tr', '{}'::jsonb)) t where jsonb_typeof(t.value) = 'object' and t.value->>'from' = b) then
    return false;
  end if;
  if coalesce((o->>'body_generated')::boolean, false) then
    fields := concat_ws(' ', s->>'species_subcategory', s->>'author_name', s->>'publication_year', s->>'type_locality',
      s->>'collector', s->>'collection_year', s->>'known_habitats', s->>'namer', s->>'naming_year', s->>'breeder',
      s->>'sowing_date', s->'formula'->>'parentA', s->'formula'->>'parentB');
    return fields ~ '[ぁ-ヿ㐀-鿿ｦ-ﾟ]';
  end if;
  if coalesce(s->>'individual_code', '') <> '' and coalesce(btrim(s->>'notes'), '') = '' and coalesce(o->>'body_en', '') <> '' then
    return false;
  end if;
  return true;
end;
$$;

-- after a record's words change: queue what needs a translation, and retire waiting drafts of words that are gone
create or replace function public.queue_origin_translations()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  o jsonb;
begin
  if TG_OP = 'UPDATE' and NEW.origins is not distinct from OLD.origins then
    return NEW;
  end if;
  update public.origin_translations t set status = 'stale', decided_at = now()
   where t.cultivar_id = NEW.id and t.status in ('queued', 'drafted', 'failed')
     and not exists (select 1 from jsonb_array_elements(coalesce(NEW.origins, '[]'::jsonb)) n where n->>'body' = t.src_text);
  if jsonb_typeof(NEW.origins) <> 'array' then return NEW; end if;
  for o in select e from jsonb_array_elements(NEW.origins) e loop
    if public.origin_needs_translation(o)
       and not exists (select 1 from public.origin_translations t
                        where t.cultivar_id = NEW.id and t.src_text = o->>'body' and t.status in ('queued', 'drafted', 'failed')) then
      insert into public.origin_translations (cultivar_id, cultivar_name, src_text)
      values (NEW.id, NEW.cultivar_name, o->>'body');
    end if;
  end loop;
  return NEW;
end;
$$;
revoke all on function public.queue_origin_translations() from public, anon, authenticated;

drop trigger if exists cultivars_queue_translations_trg on public.cultivars;
create trigger cultivars_queue_translations_trg
  after insert or update of origins on public.cultivars
  for each row execute function public.queue_origin_translations();

-- the guard: what the site sends never carries a translation of its own; an edit keeps the approved one of words
-- that did not change (same function as 20261127100000, with the tr lines added)
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
              (o - 'verification' - 'tr')
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
    -- a translation is the owner's: each record keeps the approved one it had for the same words, and nothing else
    if NEW.origins is distinct from OLD.origins and jsonb_typeof(NEW.origins) = 'array' then
      NEW.origins := (
        select coalesce(jsonb_agg(
          case
            when jsonb_typeof(n) <> 'object' then n
            else (n - 'tr') || coalesce((
              select jsonb_build_object('tr', p -> 'tr')
                from jsonb_array_elements(coalesce(OLD.origins, '[]'::jsonb)) p
               where jsonb_typeof(p) = 'object' and p ? 'tr' and p ->> 'body' = n ->> 'body'
               limit 1), '{}'::jsonb)
          end
          order by ord), '[]'::jsonb)
        from jsonb_array_elements(NEW.origins) with ordinality as t(n, ord)
      );
    end if;
  end if;
  return NEW;
end;
$$;
revoke all on function public.cultivars_write_guard() from public, anon, authenticated;

-- the owner's decision on one draft
--   approve : the text (the draft, or the owner's edit of it) goes into every record of the entry whose body is
--             still the source text word for word
--   keep    : 「原文のまま」 — the other language shows the original words, marked as such
--   redo    : back to the queue, with the owner's hint for the AI (p_text)
create or replace function public.decide_translation(p_id bigint, p_action text, p_text text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.origin_translations;
  v_text text;
  v_origins jsonb;
  v_hits int;
  v_entry jsonb;
begin
  if not public.is_admin() then
    return jsonb_build_object('success', false, 'error', 'admin only');
  end if;
  select * into r from public.origin_translations where id = p_id for update;
  if r.id is null or r.status not in ('drafted', 'failed', 'queued') then
    return jsonb_build_object('success', false, 'error', 'not waiting');
  end if;

  if p_action = 'redo' then
    update public.origin_translations
       set status = 'queued', attempts = 0, error = null, draft_text = null, flags = '[]'::jsonb,
           hint = nullif(btrim(coalesce(p_text, '')), '')
     where id = p_id;
    return jsonb_build_object('success', true, 'status', 'queued');
  end if;
  if p_action not in ('approve', 'keep') then
    return jsonb_build_object('success', false, 'error', 'unknown action');
  end if;
  if r.dst_lang is null then
    return jsonb_build_object('success', false, 'error', 'no draft yet');
  end if;
  v_text := btrim(coalesce(nullif(btrim(coalesce(p_text, '')), ''), r.draft_text, ''));
  if p_action = 'approve' and v_text = '' then
    return jsonb_build_object('success', false, 'error', 'empty translation');
  end if;
  v_entry := case when p_action = 'keep'
    then jsonb_build_object('keep', true, 'from', r.src_text, 'at', to_char(now() at time zone 'Asia/Tokyo', 'YYYY-MM-DD'))
    else jsonb_build_object('text', v_text, 'from', r.src_text, 'at', to_char(now() at time zone 'Asia/Tokyo', 'YYYY-MM-DD'),
                            'model', r.model, 'edited', v_text is distinct from btrim(coalesce(r.draft_text, '')))
  end;

  select origins into v_origins from public.cultivars where id = r.cultivar_id for update;
  select count(*) into v_hits from jsonb_array_elements(coalesce(v_origins, '[]'::jsonb)) o where o->>'body' = r.src_text;
  if v_hits = 0 then
    update public.origin_translations set status = 'stale', decided_at = now() where id = p_id;
    return jsonb_build_object('success', false, 'error', 'the words have changed since the draft');
  end if;
  v_origins := (
    select jsonb_agg(
      case when jsonb_typeof(o) = 'object' and o->>'body' = r.src_text
           then jsonb_set(o, '{tr}', coalesce(case when jsonb_typeof(o->'tr') = 'object' then o->'tr' end, '{}'::jsonb) || jsonb_build_object(r.dst_lang, v_entry))
           else o end
      order by ord)
    from jsonb_array_elements(v_origins) with ordinality as t(o, ord));
  update public.cultivars set origins = v_origins, updated_at = now() where id = r.cultivar_id;
  update public.origin_translations
     set status = case when p_action = 'keep' then 'kept' else 'approved' end,
         final_text = case when p_action = 'keep' then null else v_text end,
         decided_at = now()
   where id = p_id;
  return jsonb_build_object('success', true, 'status', case when p_action = 'keep' then 'kept' else 'approved' end);
end;
$$;
revoke all on function public.decide_translation(bigint, text, text) from public, anon;
grant execute on function public.decide_translation(bigint, text, text) to authenticated;

-- the records written before this: queue every person's body that has no translation (run once, after the edge
-- function is deployed; the drafts are only made once TRANSLATE_ENABLED is on)
insert into public.origin_translations (cultivar_id, cultivar_name, src_text)
select c.id, c.cultivar_name, o->>'body'
  from public.cultivars c, jsonb_array_elements(case when jsonb_typeof(c.origins) = 'array' then c.origins else '[]'::jsonb end) o
 where public.origin_needs_translation(o)
   and not exists (select 1 from public.origin_translations t where t.cultivar_id = c.id and t.src_text = o->>'body');

-- check (read only)
-- select status, count(*) from public.origin_translations group by 1;
