-- ============================================
-- 1. Stripe webhook error logging table (#4)
-- ============================================
CREATE TABLE IF NOT EXISTS stripe_webhook_errors (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id text NOT NULL,
  event_type text NOT NULL,
  error_message text NOT NULL,
  error_details jsonb,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_errors_status
  ON stripe_webhook_errors (status, created_at DESC);

-- ============================================
-- 2. Research-origin rate limiting table (#7)
-- ============================================
CREATE TABLE IF NOT EXISTS research_origin_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  cultivar_name text,
  requested_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_research_origin_requests_user
  ON research_origin_requests (user_id, requested_at DESC);

-- ============================================
-- 3. Constant-time hash comparison function (#1)
--    Prevents timing attacks on edit key verification
-- ============================================
CREATE OR REPLACE FUNCTION constant_time_compare(a text, b text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  a_bytes bytea;
  b_bytes bytea;
  result int := 0;
  i int;
BEGIN
  IF a IS NULL OR b IS NULL THEN RETURN false; END IF;
  a_bytes := decode(a, 'hex');
  b_bytes := decode(b, 'hex');
  IF length(a_bytes) <> length(b_bytes) THEN RETURN false; END IF;
  FOR i IN 0..length(a_bytes)-1 LOOP
    result := result | (get_byte(a_bytes, i) # get_byte(b_bytes, i));
  END LOOP;
  RETURN result = 0;
END;
$$;

-- Update RPCs to use constant_time_compare for edit key hash checks
CREATE OR REPLACE FUNCTION public.update_with_edit_key_hash(
  p_cultivar_name TEXT,
  p_edit_key_hash TEXT DEFAULT NULL,
  p_new_cultivar_name TEXT DEFAULT NULL,
  p_new_genus TEXT DEFAULT NULL,
  p_new_type TEXT DEFAULT NULL,
  p_origins JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id BIGINT;
  v_stored_hash TEXT;
  v_stored_user_id UUID;
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();

  SELECT id, edit_key_hash, user_id
    INTO v_id, v_stored_hash, v_stored_user_id
    FROM cultivars
   WHERE cultivar_name = p_cultivar_name
   LIMIT 1;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cultivar not found');
  END IF;

  IF v_caller_id IS NOT NULL AND v_stored_user_id IS NOT NULL AND v_caller_id = v_stored_user_id THEN
    NULL;
  ELSIF v_caller_id IS NOT NULL AND public.is_admin() THEN
    NULL;
  ELSE
    IF NOT check_edit_key_rate_limit(v_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait 15 minutes.');
    END IF;
    IF v_stored_hash IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'No edit key set for this cultivar');
    END IF;
    IF p_edit_key_hash IS NULL OR NOT constant_time_compare(p_edit_key_hash, v_stored_hash) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid edit key');
    END IF;
    PERFORM clear_edit_key_attempts(v_id);
  END IF;

  UPDATE cultivars SET
    cultivar_name = COALESCE(p_new_cultivar_name, cultivar_name),
    genus = COALESCE(p_new_genus, genus),
    type = COALESCE(p_new_type, type),
    origins = COALESCE(p_origins, origins),
    updated_at = now()
  WHERE id = v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_with_edit_key_hash(
  p_cultivar_id BIGINT,
  p_edit_key_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_hash TEXT;
  v_stored_user_id UUID;
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();

  SELECT edit_key_hash, user_id
    INTO v_stored_hash, v_stored_user_id
    FROM cultivars
   WHERE id = p_cultivar_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cultivar not found');
  END IF;

  IF v_caller_id IS NOT NULL AND v_stored_user_id IS NOT NULL AND v_caller_id = v_stored_user_id THEN
    NULL;
  ELSIF v_caller_id IS NOT NULL AND public.is_admin() THEN
    NULL;
  ELSE
    IF NOT check_edit_key_rate_limit(p_cultivar_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait 15 minutes.');
    END IF;
    IF v_stored_hash IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'No edit key set for this cultivar');
    END IF;
    IF p_edit_key_hash IS NULL OR NOT constant_time_compare(p_edit_key_hash, v_stored_hash) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid edit key');
    END IF;
    PERFORM clear_edit_key_attempts(p_cultivar_id);
  END IF;

  DELETE FROM cultivars WHERE id = p_cultivar_id;

  RETURN jsonb_build_object('success', true, 'id', p_cultivar_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_with_edit_key_hash(BIGINT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_with_edit_key_hash(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;

-- ============================================
-- 4. Atomic origin vote RPC (#5)
--    Prevents race conditions on concurrent votes
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

  -- Increment the vote atomically
  v_votes := jsonb_set(v_votes, ARRAY[p_vote_type], to_jsonb(v_current + 1));
  v_origin := jsonb_set(v_origin, '{votes}', v_votes);
  v_origins := jsonb_set(v_origins, ARRAY[p_origin_idx::text], v_origin);

  UPDATE cultivars SET origins = v_origins WHERE cultivar_name = p_cultivar_name;

  RETURN jsonb_build_object('success', true, 'new_count', v_current + 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_origin_vote(TEXT, INT, TEXT) TO anon, authenticated;
