-- 2026-10-08 board 9 (T119, D8): the free seedling allowance is 20 until members can join (card payments);
-- what was recorded before that stays. Rebuilt from the live definitions; only the number changed.
CREATE OR REPLACE FUNCTION public.can_post_seedling()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  ) < 20;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_seedling_quota()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    'free_limit', 20,
    'is_subscribed', v_is_sub,
    'can_post', v_is_sub OR v_used < 20
  );
END;
$function$
;
