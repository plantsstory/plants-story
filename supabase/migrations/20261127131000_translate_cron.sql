-- Translation drafts every 30 minutes (2026-11-27). Run this after translate-origin is deployed. The function does
-- nothing until the secret TRANSLATE_ENABLED is "on", and stops at the monthly AI budget; it only makes drafts, which
-- the owner approves in the admin (翻訳の確認). Same vault token as admin-digest (tools_cron_token = CRON_TOKEN).
create or replace function public.translate_origin_call()
returns bigint language sql security definer set search_path = public as $$
  select net.http_post(
    url := 'https://jpgbehsrglsiwijglhjo.supabase.co/functions/v1/translate-origin',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-token', (select decrypted_secret from vault.decrypted_secrets where name = 'tools_cron_token')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000);
$$;
revoke all on function public.translate_origin_call() from public, anon, authenticated;
-- only when something waits: an empty queue costs nothing, but there is no need to wake the function either
select cron.unschedule('translate-origin-30min') where exists (select 1 from cron.job where jobname = 'translate-origin-30min');
select cron.schedule('translate-origin-30min', '*/30 * * * *',
  $$select public.translate_origin_call() where exists (select 1 from public.origin_translations where status = 'queued')$$);
