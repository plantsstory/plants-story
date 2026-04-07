-- ============================================
-- Vote affects trust: recalculate trust % based on agree/disagree votes
-- Formula: new_trust = clamp(base_trust + (net_votes / (total_votes + 5)) * 25, 5, 98)
-- base_trust is stored on first vote so the original AI-assigned value is preserved
-- ============================================

CREATE OR REPLACE FUNCTION public.cast_origin_vote(
  p_cultivar_name TEXT,
  p_origin_idx INT,
  p_vote_type TEXT  -- 'agree' or 'disagree'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  IF p_vote_type NOT IN ('agree', 'disagree') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid vote type');
  END IF;

  -- Lock the row to prevent concurrent modifications
  SELECT origins INTO v_origins
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

  -- Preserve base_trust on first vote (original AI-assigned value)
  IF v_origin->'base_trust' IS NULL THEN
    v_base_trust := COALESCE((v_origin->>'trust')::numeric, 50);
    v_origin := jsonb_set(v_origin, '{base_trust}', to_jsonb(v_base_trust));
  ELSE
    v_base_trust := (v_origin->>'base_trust')::numeric;
  END IF;

  -- Increment the vote atomically
  v_votes := jsonb_set(v_votes, ARRAY[p_vote_type], to_jsonb(v_current + 1));
  v_origin := jsonb_set(v_origin, '{votes}', v_votes);

  -- Recalculate trust from base_trust + vote adjustment
  v_agree := COALESCE((v_votes->>'agree')::int, 0);
  v_disagree := COALESCE((v_votes->>'disagree')::int, 0);
  v_total := v_agree + v_disagree;
  v_net := v_agree - v_disagree;

  -- adjustment = (net / (total + 5)) * 25
  -- Dampening factor (+5) prevents wild swings with few votes
  -- Max adjustment approaches ±25 but never quite reaches it
  v_adjustment := (v_net / (v_total + 5.0)) * 25.0;
  v_new_trust := GREATEST(5, LEAST(98, ROUND(v_base_trust + v_adjustment)));

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
$$;
