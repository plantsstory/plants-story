-- Board 11 T149: the tools catalogue re-reads price, image and stock from Rakuten every Monday 03:00 JST, and once
-- more on the night of 10/23 before the catalogue opens (10/24). tools-research accepts the vault token only for
-- mode "refresh"; a sold-out item is unpublished by the function itself.
create or replace function public.tools_refresh_call()
returns bigint language sql security definer set search_path = public as $$
  select net.http_post(
    url := 'https://jpgbehsrglsiwijglhjo.supabase.co/functions/v1/tools-research',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-token', (select decrypted_secret from vault.decrypted_secrets where name = 'tools_cron_token')),
    body := '{"mode":"refresh"}'::jsonb,
    timeout_milliseconds := 150000);
$$;
revoke all on function public.tools_refresh_call() from public, anon, authenticated;
select cron.schedule('tools-refresh-weekly', '0 18 * * 0', 'select public.tools_refresh_call()');
select cron.schedule('tools-refresh-before-open', '0 13 23 10 *', 'select public.tools_refresh_call()');
