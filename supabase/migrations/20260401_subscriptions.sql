-- ============================================
-- Subscriptions Migration
-- Adds subscription system for My Seedlings paywall
-- ============================================

-- 1. Add stripe_customer_id to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- 2. Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
    -- 'free', 'seedling_monthly', 'seedling_annual', 'granted'
  status TEXT NOT NULL DEFAULT 'inactive',
    -- 'active', 'past_due', 'canceled', 'inactive', 'trialing'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users read own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Admin can read all subscriptions
CREATE POLICY "Admin read all subscriptions" ON public.subscriptions
  FOR SELECT USING (public.is_admin());

-- Service role (Edge Functions) can manage all subscriptions
-- (service_role bypasses RLS by default, so no explicit policy needed)

-- 4. is_subscribed() - check if current user has active subscription
CREATE OR REPLACE FUNCTION public.is_subscribed()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = auth.uid()
      AND status IN ('active', 'trialing')
      AND (
        plan = 'granted'
        OR current_period_end > now()
      )
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_subscribed() TO authenticated;

-- 5. get_seedling_detail() - gated access to seedling detail
CREATE OR REPLACE FUNCTION public.get_seedling_detail(p_cultivar_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row cultivars%ROWTYPE;
  v_is_owner BOOLEAN;
  v_is_sub BOOLEAN;
BEGIN
  SELECT * INTO v_row FROM cultivars WHERE id = p_cultivar_id AND type = 'seedling';
  IF v_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not found');
  END IF;

  v_is_owner := (auth.uid() IS NOT NULL AND v_row.user_id = auth.uid());
  v_is_sub := public.is_subscribed();

  IF v_is_sub THEN
    -- Full access with edit permission
    RETURN jsonb_build_object(
      'success', true,
      'full_access', true,
      'can_edit', true,
      'can_delete', true,
      'data', row_to_json(v_row)::jsonb
    );
  ELSIF v_is_owner THEN
    -- Owner without subscription: view + delete only
    RETURN jsonb_build_object(
      'success', true,
      'full_access', true,
      'can_edit', false,
      'can_delete', true,
      'data', row_to_json(v_row)::jsonb
    );
  ELSE
    -- Non-subscriber, non-owner: limited data
    RETURN jsonb_build_object(
      'success', true,
      'full_access', false,
      'can_edit', false,
      'can_delete', false,
      'data', jsonb_build_object(
        'id', v_row.id,
        'genus', v_row.genus,
        'cultivar_name', v_row.cultivar_name,
        'type', v_row.type,
        'created_at', v_row.created_at,
        'user_id', v_row.user_id
      )
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_seedling_detail(BIGINT) TO anon, authenticated;

-- 6. Admin RPC: grant free subscription
CREATE OR REPLACE FUNCTION public.admin_grant_subscription(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (p_user_id, 'granted', 'active')
  ON CONFLICT (user_id) DO UPDATE SET
    plan = 'granted',
    status = 'active',
    current_period_start = now(),
    current_period_end = NULL,
    cancel_at_period_end = false,
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_subscription(UUID) TO authenticated;

-- 7. Admin RPC: revoke free subscription
CREATE OR REPLACE FUNCTION public.admin_revoke_subscription(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  UPDATE public.subscriptions
  SET plan = 'free',
      status = 'canceled',
      updated_at = now()
  WHERE user_id = p_user_id AND plan = 'granted';

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_revoke_subscription(UUID) TO authenticated;

-- 8. Admin RPC: list users with subscription info
CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_search TEXT DEFAULT NULL,
  p_filter_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_total INT;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  -- Count total
  SELECT count(*) INTO v_total
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.user_id = p.id
  WHERE (p_search IS NULL OR p_search = ''
    OR p.display_name ILIKE '%' || p_search || '%'
    OR p.username ILIKE '%' || p_search || '%')
  AND (p_filter_status IS NULL OR p_filter_status = ''
    OR COALESCE(s.status, 'none') = p_filter_status
    OR (p_filter_status = 'granted' AND s.plan = 'granted'));

  -- Get results
  SELECT jsonb_agg(row_data) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'display_name', p.display_name,
      'username', p.username,
      'avatar_url', p.avatar_url,
      'created_at', p.created_at,
      'subscription_plan', COALESCE(s.plan, 'free'),
      'subscription_status', COALESCE(s.status, 'none'),
      'current_period_end', s.current_period_end,
      'cancel_at_period_end', COALESCE(s.cancel_at_period_end, false)
    ) AS row_data
    FROM public.profiles p
    LEFT JOIN public.subscriptions s ON s.user_id = p.id
    WHERE (p_search IS NULL OR p_search = ''
      OR p.display_name ILIKE '%' || p_search || '%'
      OR p.username ILIKE '%' || p_search || '%')
    AND (p_filter_status IS NULL OR p_filter_status = ''
      OR COALESCE(s.status, 'none') = p_filter_status
      OR (p_filter_status = 'granted' AND s.plan = 'granted'))
    ORDER BY p.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object(
    'success', true,
    'total', v_total,
    'users', COALESCE(v_result, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users(TEXT, TEXT, INT, INT) TO authenticated;
