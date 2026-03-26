-- ============================================
-- Edit Key V2 Migration (pgcrypto-free)
-- Client sends pre-hashed SHA256, server only stores/compares
-- ============================================

-- 1. Add edit_key_hash column (if not already added)
ALTER TABLE public.cultivars
  ADD COLUMN IF NOT EXISTS edit_key_hash TEXT;

-- 2. Drop old broken functions that depend on pgcrypto
DROP FUNCTION IF EXISTS public.insert_with_edit_key(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_with_edit_key(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);

-- 3. Insert RPC: accepts pre-hashed edit key from client
CREATE OR REPLACE FUNCTION public.insert_with_edit_key_hash(
  p_genus TEXT,
  p_cultivar_name TEXT,
  p_type TEXT,
  p_origins JSONB,
  p_edit_key_hash TEXT DEFAULT NULL,
  p_ai_status TEXT DEFAULT 'pending'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row cultivars%ROWTYPE;
BEGIN
  INSERT INTO cultivars (genus, cultivar_name, type, origins, votes, ai_status, edit_key_hash)
  VALUES (p_genus, p_cultivar_name, p_type, p_origins, '{}'::json, p_ai_status, p_edit_key_hash)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('success', true, 'id', v_row.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_with_edit_key_hash(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO anon, authenticated;

-- 4. Update RPC: compares pre-hashed edit key with stored hash
CREATE OR REPLACE FUNCTION public.update_with_edit_key_hash(
  p_cultivar_name TEXT,
  p_edit_key_hash TEXT,
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
BEGIN
  SELECT id, edit_key_hash
    INTO v_id, v_stored_hash
    FROM cultivars
   WHERE cultivar_name = p_cultivar_name
   LIMIT 1;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cultivar not found');
  END IF;

  IF v_stored_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No edit key set for this cultivar');
  END IF;

  IF p_edit_key_hash <> v_stored_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid edit key');
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

GRANT EXECUTE ON FUNCTION public.update_with_edit_key_hash(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;
