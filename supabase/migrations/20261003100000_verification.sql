-- T26 verification workflow (BOARD 第4回・第6回, docs/board/2026-09-05-taxonomy.md §3).
-- 検証済 = an admin checked the sources and the site stands behind the record as of that date. Not an identification.
alter table public.cultivars
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id) on delete set null,
  add column if not exists verification_note text;

create or replace function public.set_cultivar_verification(p_id bigint, p_verified boolean, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if not public.is_admin() then return jsonb_build_object('success', false, 'error', 'Permission denied'); end if;
  select user_id into v_owner from cultivars where id = p_id;
  if p_verified then
    update cultivars set verified_at = now(), verified_by = auth.uid(),
      verification_note = left(coalesce(p_note, '') || case when v_owner is not null and v_owner = auth.uid() then '（自己投稿）' else '' end, 200)
    where id = p_id;
  else
    update cultivars set verified_at = null, verified_by = null, verification_note = null where id = p_id;
  end if;
  return jsonb_build_object('success', true);
end $$;
revoke all on function public.set_cultivar_verification(bigint, boolean, text) from public, anon;
grant execute on function public.set_cultivar_verification(bigint, boolean, text) to authenticated;

-- Votes still count on a verified entry but no longer move its trust; a clear majority against it
-- (disagree − agree ≥ 3 with 5+ votes) puts it back in the admin's re-check queue.
CREATE OR REPLACE FUNCTION public.cast_origin_vote(p_cultivar_name text, p_origin_idx integer, p_vote_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '10s'
AS $function$
DECLARE
  v_origins JSONB;
  v_origin JSONB;
  v_votes JSONB;
  v_current INT;
  v_base_trust NUMERIC;
  v_agree INT;
  v_disagree INT;
  v_net NUMERIC;
  v_total INT;
  v_adjustment NUMERIC;
  v_new_trust INT;
  v_verified TIMESTAMPTZ;
BEGIN
  IF p_vote_type NOT IN ('agree', 'disagree') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid vote type');
  END IF;

  SELECT origins, verified_at INTO v_origins, v_verified
    FROM cultivars
   WHERE cultivar_name = p_cultivar_name
   FOR UPDATE;

  IF v_origins IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cultivar not found');
  END IF;

  IF p_origin_idx < 0 OR p_origin_idx >= jsonb_array_length(v_origins) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid origin index');
  END IF;

  v_origin := v_origins->p_origin_idx;
  v_votes := COALESCE(v_origin->'votes', '{"agree":0,"disagree":0}'::jsonb);
  v_current := COALESCE((v_votes->>p_vote_type)::int, 0);

  IF v_origin->'base_trust' IS NULL THEN
    v_base_trust := COALESCE((v_origin->>'trust')::numeric, 50);
    v_origin := jsonb_set(v_origin, '{base_trust}', to_jsonb(v_base_trust));
  ELSE
    v_base_trust := (v_origin->>'base_trust')::numeric;
  END IF;

  v_votes := jsonb_set(v_votes, ARRAY[p_vote_type], to_jsonb(v_current + 1));
  v_origin := jsonb_set(v_origin, '{votes}', v_votes);

  v_agree := COALESCE((v_votes->>'agree')::int, 0);
  v_disagree := COALESCE((v_votes->>'disagree')::int, 0);
  v_total := v_agree + v_disagree;
  v_net := v_agree - v_disagree;

  IF v_verified IS NOT NULL THEN
    -- verified: the trust stays where the admin left it
    v_new_trust := COALESCE((v_origin->>'trust')::int, ROUND(v_base_trust)::int);
    IF v_disagree - v_agree >= 3 AND v_total >= 5 THEN
      UPDATE cultivars SET verification_note = '[要再確認] ' || regexp_replace(coalesce(verification_note, ''), '^\[要再確認\] ', '')
       WHERE cultivar_name = p_cultivar_name AND coalesce(verification_note, '') NOT LIKE '[要再確認]%';
    END IF;
  ELSE
    v_adjustment := (v_net / (v_total + 5.0)) * 25.0;
    v_new_trust := GREATEST(5, LEAST(98, ROUND(v_base_trust + v_adjustment)));
  END IF;

  v_origin := jsonb_set(v_origin, '{trust}', to_jsonb(v_new_trust));
  v_origins := jsonb_set(v_origins, ARRAY[p_origin_idx::text], v_origin);

  UPDATE cultivars SET origins = v_origins WHERE cultivar_name = p_cultivar_name;

  RETURN jsonb_build_object(
    'success', true,
    'new_count', v_current + 1,
    'new_trust', v_new_trust,
    'base_trust', v_base_trust
  );
END;
$function$;
