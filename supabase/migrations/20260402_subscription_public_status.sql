-- ============================================
-- Public subscription status RPC
-- Returns only plan and status for any user (safe for public profiles)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_subscription_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
BEGIN
  SELECT plan, status, current_period_end, cancel_at_period_end
  INTO v_sub
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND status IN ('active', 'trialing')
  LIMIT 1;

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('active', false, 'plan', 'free');
  END IF;

  RETURN jsonb_build_object(
    'active', true,
    'plan', v_sub.plan,
    'status', v_sub.status,
    'current_period_end', v_sub.current_period_end,
    'cancel_at_period_end', v_sub.cancel_at_period_end
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_subscription_status(UUID) TO anon, authenticated;
