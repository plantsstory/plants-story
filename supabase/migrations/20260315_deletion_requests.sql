-- ============================================
-- Deletion Requests Migration
-- Adds deletion request system for cultivars and images
-- ============================================

-- 1. Create deletion_requests table
CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id BIGSERIAL PRIMARY KEY,
  target_type TEXT NOT NULL,        -- 'cultivar' or 'image'
  target_id BIGINT NOT NULL,
  target_name TEXT,                  -- display name
  reason TEXT NOT NULL,
  reason_detail TEXT,
  status TEXT DEFAULT 'pending',     -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 2. Enable RLS
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Public read deletion_requests" ON public.deletion_requests
  FOR SELECT USING (true);

CREATE POLICY "Public insert deletion_requests" ON public.deletion_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin update deletion_requests" ON public.deletion_requests
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin delete deletion_requests" ON public.deletion_requests
  FOR DELETE USING (public.is_admin());

-- 4. RPC to submit deletion request (SECURITY DEFINER for anonymous access)
CREATE OR REPLACE FUNCTION public.submit_deletion_request(
  p_target_type TEXT,
  p_target_id BIGINT,
  p_target_name TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_reason_detail TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO deletion_requests (target_type, target_id, target_name, reason, reason_detail)
  VALUES (p_target_type, p_target_id, p_target_name, p_reason, p_reason_detail)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_deletion_request(TEXT, BIGINT, TEXT, TEXT, TEXT) TO anon, authenticated;
