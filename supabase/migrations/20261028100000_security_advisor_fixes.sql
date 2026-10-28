-- 2026-10-28: Supabase Security Advisor findings (the owner received the advisor e-mail).
-- 1. ERROR rls_disabled_in_public: two tables open to anyone with the public key. Both are written only by edge
--    functions with the service key, so RLS with no policy (service key only) changes nothing for the site.
alter table public.research_origin_requests enable row level security;
alter table public.stripe_webhook_errors enable row level security;
revoke all on public.research_origin_requests, public.stripe_webhook_errors, public.origin_append_log from anon, authenticated;

-- 2. insert_with_edit_key (the old edit-key insert): no login check — anyone could add an entry. The site uses
--    insert_with_edit_key_hash (login required); this one is closed to every caller.
revoke all on function public.insert_with_edit_key(text, text, text, jsonb, text, text) from public, anon, authenticated;

-- 3. Admin-only, maintenance and trigger functions: not for the public key (each also checks inside, or cannot be
--    called as an RPC at all). Functions a logged-out reader needs (lists, counts, contact form, error log) stay.
revoke execute on function public.admin_grant_subscription(uuid) from public, anon;
revoke execute on function public.admin_revoke_subscription(uuid) from public, anon;
revoke execute on function public.admin_list_users(text, text, integer, integer) from public, anon;
revoke execute on function public.genus_request_summary() from public, anon;
revoke execute on function public.cleanup_old_ips() from public, anon;
revoke execute on function public.cleanup_old_contact_ips() from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.image_fill_columns() from public, anon, authenticated;
revoke execute on function public.cultivars_origins_guard() from public, anon, authenticated;
revoke execute on function public.research_requests_guard() from public, anon, authenticated;

-- 4. get_subscription_status: the 「Member」 badge on a public profile stays (active and plan); the renewal date
--    and cancellation go only to the person themself or an admin.
create or replace function public.get_subscription_status(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' set statement_timeout to '5s' as $$
declare v_sub record; v_self boolean := (auth.uid() is not null and auth.uid() = p_user_id) or public.is_admin();
begin
  select plan, status, current_period_end, cancel_at_period_end into v_sub
    from public.subscriptions where user_id = p_user_id and status in ('active', 'trialing') limit 1;
  if v_sub is null then return jsonb_build_object('active', false, 'plan', 'free'); end if;
  if not v_self then return jsonb_build_object('active', true, 'plan', v_sub.plan, 'status', v_sub.status); end if;
  return jsonb_build_object('active', true, 'plan', v_sub.plan, 'status', v_sub.status,
    'current_period_end', v_sub.current_period_end, 'cancel_at_period_end', v_sub.cancel_at_period_end);
end $$;

-- 5. WARN function_search_path_mutable: pin search_path on the functions that did not set it (bodies unchanged)
do $$
declare f regprocedure;
begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prokind = 'f'
              and p.proname in ('is_subscribed','constant_time_compare','log_client_error','is_admin','research_requests_guard',
                                'cultivars_private_guard','articles_touch','no_ip_columns','vote_on_image','image_taken_on_from_caption')
              and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
  loop
    execute format('alter function %s set search_path = public', f);
  end loop;
end $$;
