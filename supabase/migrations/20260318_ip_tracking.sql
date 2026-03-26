-- ============================================
-- IP Tracking Migration
-- Adds created_ip to cultivars and cultivar_images
-- Adds origin_added_ip to cultivars (for origin append tracking)
-- 180-day auto-cleanup function
-- ============================================

-- 1. Add IP columns
ALTER TABLE public.cultivars
  ADD COLUMN IF NOT EXISTS created_ip TEXT,
  ADD COLUMN IF NOT EXISTS origin_added_ip TEXT;

ALTER TABLE public.cultivar_images
  ADD COLUMN IF NOT EXISTS created_ip TEXT;

-- 2. Update insert_with_edit_key_hash to accept IP
DROP FUNCTION IF EXISTS public.insert_with_edit_key_hash(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.insert_with_edit_key_hash(
  p_genus TEXT,
  p_cultivar_name TEXT,
  p_type TEXT,
  p_origins JSONB,
  p_edit_key_hash TEXT DEFAULT NULL,
  p_ai_status TEXT DEFAULT 'pending',
  p_created_ip TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row cultivars%ROWTYPE;
BEGIN
  INSERT INTO cultivars (genus, cultivar_name, type, origins, votes, ai_status, edit_key_hash, created_ip)
  VALUES (p_genus, p_cultivar_name, p_type, p_origins, '{}'::json, p_ai_status, p_edit_key_hash, p_created_ip)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('success', true, 'id', v_row.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_with_edit_key_hash(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 3. Update append_origin to accept IP
DROP FUNCTION IF EXISTS public.append_origin(TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.append_origin(
  p_cultivar_name TEXT,
  p_origin JSONB,
  p_ip TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id BIGINT;
  v_origins JSONB;
BEGIN
  SELECT id, COALESCE(origins, '[]'::jsonb)
    INTO v_id, v_origins
    FROM cultivars
   WHERE cultivar_name = p_cultivar_name
   LIMIT 1;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cultivar not found');
  END IF;

  v_origins := v_origins || jsonb_build_array(p_origin);

  UPDATE cultivars SET origins = v_origins, origin_added_ip = p_ip WHERE id = v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.append_origin(TEXT, JSONB, TEXT) TO anon, authenticated;

-- 4. Cleanup function: nullify IPs older than 180 days
CREATE OR REPLACE FUNCTION public.cleanup_old_ips()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE cultivars SET created_ip = NULL
   WHERE created_ip IS NOT NULL
     AND created_at < NOW() - INTERVAL '180 days';

  UPDATE cultivars SET origin_added_ip = NULL
   WHERE origin_added_ip IS NOT NULL
     AND updated_at < NOW() - INTERVAL '180 days';

  UPDATE cultivar_images SET created_ip = NULL
   WHERE created_ip IS NOT NULL
     AND created_at < NOW() - INTERVAL '180 days';
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_ips() TO authenticated;
