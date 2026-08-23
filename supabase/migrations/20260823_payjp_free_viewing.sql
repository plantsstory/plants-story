-- ============================================
-- PAY.JP migration + free seedling viewing + 5-post free quota (2026-08-23)
-- 1. Seedling viewing becomes free for everyone (drop paywalled SELECT policy)
-- 2. Seedling posting: first 5 posts free per user, subscription required after
-- 3. PAY.JP columns (Stripe columns kept for historical data)
-- ============================================

-- ---------- 1. Free seedling viewing ----------
DROP POLICY IF EXISTS "Seedling detail restricted" ON public.cultivars;
DROP POLICY IF EXISTS "Public read" ON public.cultivars;

CREATE POLICY "Public read" ON public.cultivars
  FOR SELECT USING (true);

-- get_seedling_detail: full data for everyone; edit/delete for owner or admin
CREATE OR REPLACE FUNCTION public.get_seedling_detail(p_cultivar_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row cultivars%ROWTYPE;
  v_is_owner BOOLEAN;
BEGIN
  SELECT * INTO v_row FROM cultivars WHERE id = p_cultivar_id AND type = 'seedling';
  IF v_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not found');
  END IF;

  v_is_owner := (auth.uid() IS NOT NULL AND v_row.user_id = auth.uid());

  RETURN jsonb_build_object(
    'success', true,
    'full_access', true,
    'can_edit', v_is_owner OR public.is_admin(),
    'can_delete', v_is_owner OR public.is_admin(),
    'data', row_to_json(v_row)::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_seedling_detail(BIGINT) TO anon, authenticated;

-- ---------- 2. Seedling posting quota (5 free, then subscription) ----------
CREATE OR REPLACE FUNCTION public.can_post_seedling()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  IF public.is_subscribed() THEN
    RETURN true;
  END IF;
  RETURN (
    SELECT COUNT(*) FROM cultivars
    WHERE user_id = auth.uid() AND type = 'seedling'
  ) < 5;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_post_seedling() TO authenticated;

-- Quota info for the frontend (remaining free posts, subscription state)
CREATE OR REPLACE FUNCTION public.get_seedling_quota()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_used INT;
  v_is_sub BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT COUNT(*) INTO v_used
  FROM cultivars
  WHERE user_id = auth.uid() AND type = 'seedling';

  v_is_sub := public.is_subscribed();

  RETURN jsonb_build_object(
    'success', true,
    'used', v_used,
    'free_limit', 5,
    'is_subscribed', v_is_sub,
    'can_post', v_is_sub OR v_used < 5
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_seedling_quota() TO authenticated;

-- Enforce quota in the insert RPC (the path the app actually uses)
CREATE OR REPLACE FUNCTION public.insert_with_edit_key_hash(
  p_genus TEXT,
  p_cultivar_name TEXT,
  p_type TEXT,
  p_origins JSONB,
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
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF p_type = 'seedling' AND NOT public.can_post_seedling() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Seedling quota exceeded');
  END IF;

  INSERT INTO cultivars (genus, cultivar_name, type, origins, votes, ai_status, edit_key_hash, created_ip, user_id)
  VALUES (p_genus, p_cultivar_name, p_type, p_origins, '{}'::json, p_ai_status, NULL, p_created_ip, auth.uid())
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('success', true, 'id', v_row.id);
END;
$$;

-- Defense in depth: direct PostgREST inserts also respect the quota
DROP POLICY IF EXISTS "Authenticated insert" ON public.cultivars;
CREATE POLICY "Authenticated insert" ON public.cultivars
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (type IS DISTINCT FROM 'seedling' OR public.can_post_seedling())
  );

-- is_active_subscriber: align with is_subscribed (period end honored so
-- canceled-at-period-end users keep access until the paid period expires)
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
      AND (plan = 'granted' OR current_period_end > now())
  );
END;
$$;

-- ---------- 3. PAY.JP columns ----------
-- profiles.payjp_customer_id: NOT added to the column-level GRANT list from
-- 20260807_security_hardening.sql, so it stays service_role-only like
-- stripe_customer_id.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payjp_customer_id TEXT;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payjp_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS payjp_subscription_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_payjp_subscription_id_key
  ON public.subscriptions (payjp_subscription_id)
  WHERE payjp_subscription_id IS NOT NULL;

-- ---------- 4. Trial abolished: remove trial reminder cron ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('trial-reminder-daily');
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Job may not exist; ignore
  NULL;
END;
$$;
