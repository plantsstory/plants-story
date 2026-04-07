-- Trial reminder cron job: calls trial-reminder Edge Function daily at 9:00 AM JST (00:00 UTC)
-- Requires pg_cron and pg_net extensions (available on Supabase Pro plan)

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily cron job to invoke the trial-reminder Edge Function
-- Runs at 00:00 UTC = 09:00 JST
SELECT cron.schedule(
  'trial-reminder-daily',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/trial-reminder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
