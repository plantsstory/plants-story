-- ============================================
-- Add statement_timeout to all RPC functions
-- Prevents long-running queries from hogging connections
-- Read-only: 5s, Write/mutation: 10s, Admin: 15s
-- ============================================

-- Read-only functions (5s)
ALTER FUNCTION public.get_cultivars_paginated SET statement_timeout = '5s';
ALTER FUNCTION public.get_recent_cultivars SET statement_timeout = '5s';
ALTER FUNCTION public.get_genus_counts SET statement_timeout = '5s';
ALTER FUNCTION public.is_admin SET statement_timeout = '5s';
ALTER FUNCTION public.is_subscribed SET statement_timeout = '5s';
ALTER FUNCTION public.get_subscription_status SET statement_timeout = '5s';
ALTER FUNCTION public.resolve_username SET statement_timeout = '5s';
ALTER FUNCTION public.check_username_available SET statement_timeout = '5s';
ALTER FUNCTION public.search_profiles SET statement_timeout = '5s';
ALTER FUNCTION public.get_seedling_detail SET statement_timeout = '5s';

-- Write/mutation functions (10s)
ALTER FUNCTION public.insert_with_edit_key_hash SET statement_timeout = '10s';
ALTER FUNCTION public.update_with_edit_key_hash SET statement_timeout = '10s';
ALTER FUNCTION public.delete_with_edit_key_hash SET statement_timeout = '10s';
ALTER FUNCTION public.append_origin SET statement_timeout = '10s';
ALTER FUNCTION public.upsert_profile SET statement_timeout = '10s';
ALTER FUNCTION public.cast_origin_vote SET statement_timeout = '10s';
ALTER FUNCTION public.vote_on_image SET statement_timeout = '10s';
ALTER FUNCTION public.submit_deletion_request SET statement_timeout = '10s';
ALTER FUNCTION public.log_client_error SET statement_timeout = '10s';

-- Admin functions (15s)
ALTER FUNCTION public.admin_grant_subscription SET statement_timeout = '15s';
ALTER FUNCTION public.admin_revoke_subscription SET statement_timeout = '15s';
ALTER FUNCTION public.admin_list_users SET statement_timeout = '15s';
