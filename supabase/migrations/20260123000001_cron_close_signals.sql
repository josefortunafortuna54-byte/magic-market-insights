-- Schedule close-signals to run every 30 minutes
-- Safe to re-run (removes existing job before re-creating)
--
-- IMPORTANT: pg_cron and pg_net extensions must be enabled first!
-- Run in Supabase SQL Editor:
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--   CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing job if it exists (ignore error if not found)
DO $$ BEGIN
  PERFORM cron.unschedule('close-signals-every-30min');
EXCEPTION WHEN OTHERS THEN
  NULL; -- job didn't exist, that's fine
END $$;

-- Schedule the job
SELECT cron.schedule(
  'close-signals-every-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/close-signals',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'apikey', current_setting('app.settings.anon_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
