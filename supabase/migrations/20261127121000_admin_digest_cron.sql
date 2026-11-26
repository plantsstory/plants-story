-- Admin reorganisation (2026-11-26): one mail a day to the operator's own address when something waits in the
-- admin (reports, contact, AI suggestions, re-research and listing requests, re-checks, other people's new posts).
-- No mail on a day with nothing waiting. Runs at 08:00 JST. The function is admin-digest; it takes the same vault
-- token as tools-research (CRON_TOKEN) and sends only to ALERT_EMAIL. Run this after admin-digest is deployed.
create or replace function public.admin_digest_call()
returns bigint language sql security definer set search_path = public as $$
  select net.http_post(
    url := 'https://jpgbehsrglsiwijglhjo.supabase.co/functions/v1/admin-digest',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-token', (select decrypted_secret from vault.decrypted_secrets where name = 'tools_cron_token')),
    body := '{"mode":"daily"}'::jsonb,
    timeout_milliseconds := 30000);
$$;
revoke all on function public.admin_digest_call() from public, anon, authenticated;
select cron.unschedule('admin-digest-daily') where exists (select 1 from cron.job where jobname = 'admin-digest-daily');
select cron.schedule('admin-digest-daily', '0 23 * * *', 'select public.admin_digest_call()');
