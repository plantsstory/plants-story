-- ============================================
-- 1. Add index on cultivar_images.cultivar_name for thumbnail lookups
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cultivar_images_cultivar_name
  ON cultivar_images (cultivar_name);

-- ============================================
-- 2. Edit key brute-force protection
--    Track failed attempts per cultivar, lock after 5 failures for 15 min
-- ============================================
CREATE TABLE IF NOT EXISTS edit_key_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cultivar_id bigint NOT NULL,
  attempt_count int DEFAULT 1,
  last_attempt_at timestamptz DEFAULT now(),
  locked_until timestamptz DEFAULT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_edit_key_attempts_cultivar
  ON edit_key_attempts (cultivar_id);

-- Helper: check and record edit key attempt
CREATE OR REPLACE FUNCTION check_edit_key_rate_limit(p_cultivar_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec edit_key_attempts%ROWTYPE;
BEGIN
  SELECT * INTO v_rec FROM edit_key_attempts WHERE cultivar_id = p_cultivar_id;

  IF FOUND THEN
    -- Check if currently locked
    IF v_rec.locked_until IS NOT NULL AND v_rec.locked_until > now() THEN
      RETURN false; -- Still locked
    END IF;

    -- Reset if lock expired or last attempt was > 15 min ago
    IF v_rec.locked_until IS NOT NULL AND v_rec.locked_until <= now() THEN
      UPDATE edit_key_attempts
        SET attempt_count = 1, last_attempt_at = now(), locked_until = NULL
        WHERE cultivar_id = p_cultivar_id;
      RETURN true;
    END IF;

    -- Increment attempt count
    IF v_rec.last_attempt_at > now() - interval '15 minutes' THEN
      IF v_rec.attempt_count >= 5 THEN
        -- Lock for 15 minutes
        UPDATE edit_key_attempts
          SET locked_until = now() + interval '15 minutes', last_attempt_at = now()
          WHERE cultivar_id = p_cultivar_id;
        RETURN false;
      ELSE
        UPDATE edit_key_attempts
          SET attempt_count = v_rec.attempt_count + 1, last_attempt_at = now()
          WHERE cultivar_id = p_cultivar_id;
        RETURN true;
      END IF;
    ELSE
      -- Reset counter if window expired
      UPDATE edit_key_attempts
        SET attempt_count = 1, last_attempt_at = now(), locked_until = NULL
        WHERE cultivar_id = p_cultivar_id;
      RETURN true;
    END IF;
  ELSE
    -- First attempt
    INSERT INTO edit_key_attempts (cultivar_id) VALUES (p_cultivar_id);
    RETURN true;
  END IF;
END;
$$;

-- Helper: clear attempts on successful key verification
CREATE OR REPLACE FUNCTION clear_edit_key_attempts(p_cultivar_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM edit_key_attempts WHERE cultivar_id = p_cultivar_id;
END;
$$;

-- ============================================
-- 3. Update update_with_edit_key_hash to use rate limiting + auth.uid()
-- ============================================
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

  -- Allow update if authenticated user owns the cultivar
  IF v_caller_id IS NOT NULL AND v_stored_user_id IS NOT NULL AND v_caller_id = v_stored_user_id THEN
    NULL; -- Skip edit key check
  -- Allow admin
  ELSIF v_caller_id IS NOT NULL AND public.is_admin() THEN
    NULL; -- Admin override
  ELSE
    -- Edit key path: apply rate limiting
    IF NOT check_edit_key_rate_limit(v_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait 15 minutes.');
    END IF;

    IF v_stored_hash IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'No edit key set for this cultivar');
    END IF;

    IF p_edit_key_hash IS NULL OR p_edit_key_hash <> v_stored_hash THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid edit key');
    END IF;

    -- Success: clear attempts
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

-- ============================================
-- 4. Update delete_with_edit_key_hash to also use rate limiting
-- ============================================
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

  -- Allow delete if authenticated user owns the cultivar
  IF v_caller_id IS NOT NULL AND v_stored_user_id IS NOT NULL AND v_caller_id = v_stored_user_id THEN
    NULL; -- Skip edit key check
  -- Allow admin to delete any cultivar
  ELSIF v_caller_id IS NOT NULL AND public.is_admin() THEN
    NULL; -- Admin override
  ELSE
    -- Edit key path: apply rate limiting
    IF NOT check_edit_key_rate_limit(p_cultivar_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait 15 minutes.');
    END IF;

    IF v_stored_hash IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'No edit key set for this cultivar');
    END IF;

    IF p_edit_key_hash IS NULL OR p_edit_key_hash <> v_stored_hash THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid edit key');
    END IF;

    -- Success: clear attempts
    PERFORM clear_edit_key_attempts(p_cultivar_id);
  END IF;

  DELETE FROM cultivars WHERE id = p_cultivar_id;

  RETURN jsonb_build_object('success', true, 'id', p_cultivar_id);
END;
$$;

-- Cleanup: remove old 3-parameter version grant if exists
GRANT EXECUTE ON FUNCTION public.delete_with_edit_key_hash(BIGINT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_with_edit_key_hash(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;
