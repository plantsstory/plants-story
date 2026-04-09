-- ============================================
-- A-2: Seedling data server-side access control
-- A-3: deletion_requests RLS hardening
-- ============================================

-- A-2: Restrict seedling detail access to authenticated subscribers or owners
CREATE OR REPLACE FUNCTION public.is_active_subscriber()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = auth.uid()
      AND status IN ('active', 'trialing')
  );
END;
$$;

-- Drop old permissive select policy and replace with restricted one for seedlings
DROP POLICY IF EXISTS "Seedling detail restricted" ON public.cultivars;
DROP POLICY IF EXISTS "Public read" ON public.cultivars;

CREATE POLICY "Seedling detail restricted" ON public.cultivars
  FOR SELECT USING (
    type != 'seedling'
    OR auth.uid() = user_id
    OR public.is_active_subscriber()
    OR public.is_admin()
  );

GRANT EXECUTE ON FUNCTION public.is_active_subscriber() TO authenticated;
ALTER FUNCTION public.is_active_subscriber SET statement_timeout = '5s';

-- A-3: Add user_id column to deletion_requests FIRST (needed for policy)
ALTER TABLE public.deletion_requests ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();

-- Drop any old insert policies
DROP POLICY IF EXISTS "Anyone can insert deletion requests" ON public.deletion_requests;
DROP POLICY IF EXISTS "Anon insert deletion_requests" ON public.deletion_requests;
DROP POLICY IF EXISTS "Public insert deletion_requests" ON public.deletion_requests;

-- Restrict to authenticated users with rate limit (max 5 per hour)
CREATE POLICY "Authenticated insert deletion_requests" ON public.deletion_requests
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      SELECT COUNT(*) FROM deletion_requests
      WHERE user_id = auth.uid()
        AND created_at > now() - interval '1 hour'
    ) < 5
  );
