-- 2026-11-10 (owner's decision): paid membership is paused. Everything is free; seedling notes have no cap.
-- The subscription tables and functions stay as they are. To bring the cap back, restore the two bodies below
-- from 20260823_payjp_free_viewing.sql (the limit was 20 per user for non-members).

CREATE OR REPLACE FUNCTION public.can_post_seedling()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_seedling_quota()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_used INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  SELECT COUNT(*) INTO v_used FROM cultivars WHERE user_id = auth.uid() AND type = 'seedling';
  RETURN jsonb_build_object('success', true, 'used', v_used, 'free_limit', NULL,
                            'is_subscribed', public.is_subscribed(), 'can_post', true);
END;
$function$;

-- The privacy policy says IP addresses are erased after 180 days and error records after 90. The clean-up
-- functions existed but nothing ran them: schedule them (01:20 and 01:30 JST, daily).
SELECT cron.schedule('cleanup-ips-daily', '20 16 * * *', $$SELECT public.cleanup_old_ips(); SELECT public.cleanup_old_contact_ips();$$);
SELECT cron.schedule('cleanup-error-logs-daily', '30 16 * * *', $$DELETE FROM public.error_logs WHERE created_at < now() - interval '90 days'$$);
