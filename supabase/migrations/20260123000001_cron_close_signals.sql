-- ============================================================
-- CRON: close-signals every 30 minutes
-- ============================================================
-- This migration creates a cron job that calls the
-- close-signals edge function via pg_net.
--
-- PREREQUISITES (run in Supabase SQL Editor first):
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--   CREATE EXTENSION IF NOT EXISTS pg_net;
-- ============================================================

-- Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing job if it exists
DO $$ BEGIN
  PERFORM cron.unschedule('close-signals-every-30min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- OPTION A: If you have app.settings configured in supabase
-- ============================================================
DO $$
BEGIN
  -- Try to use app.settings (requires supabase_config in postgresql.conf)
  IF current_setting('app.settings.supabase_url', true) IS NOT NULL
     AND current_setting('app.settings.supabase_url', true) != ''
  THEN
    PERFORM cron.schedule(
      'close-signals-every-30min',
      '*/30 * * * *',
      $fn$
        SELECT net.http_post(
          url := current_setting('app.settings.supabase_url') || '/functions/v1/close-signals',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
            'apikey', current_setting('app.settings.anon_key')
          ),
          body := '{}'::jsonb
        );
      $fn$
    );
  ELSE
    RAISE NOTICE 'app.settings not configured — run OPTION B migration instead';
  END IF;
END $$;

-- ============================================================
-- OPTION B: Hardcoded fallback — SET YOUR VALUES BELOW
-- Run this manually in SQL Editor if OPTION A didn't work:
-- ============================================================
/*
-- Replace YOUR_PROJECT_URL and YOUR_SERVICE_ROLE_KEY:
SELECT cron.schedule(
  'close-signals-every-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'YOUR_PROJECT_URL/functions/v1/close-signals',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'apikey', 'YOUR_ANON_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
*/
