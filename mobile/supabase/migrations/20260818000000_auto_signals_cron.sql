-- Auto-generate signals at 17 WAT times + auto-close TP/SL every 30min
-- WAT = UTC+1, so we schedule in UTC

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Helper: call edge function via pg_net
CREATE OR REPLACE FUNCTION public.call_edge_function(
  function_name text,
  method text DEFAULT 'POST'
) RETURNS void AS $$
DECLARE
  supabase_url text := current_setting('app.settings.supabase_url', true);
  service_role_key text := current_setting('app.settings.service_role_key', true);
  full_url text;
BEGIN
  -- Fallback to env vars if settings not set
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := COALESCE(current_setting('request.headers', true)::json->>'x-forwarded-host', '');
    IF supabase_url != '' THEN
      supabase_url := 'https://' || supabase_url;
    END IF;
  END IF;

  IF supabase_url IS NULL OR supabase_url = '' THEN
    RAISE WARNING 'call_edge_function: SUPABASE_URL not configured';
    RETURN;
  END IF;

  full_url := supabase_url || '/functions/v1/' || function_name;

  PERFORM net.http_post(
    url := full_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', COALESCE(service_role_key, ''),
      'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
    ),
    body := '{}'::jsonb
  );

  RAISE LOG 'call_edge_function: called %', function_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to generate signals (called by cron)
CREATE OR REPLACE FUNCTION public.cron_generate_signals()
RETURNS void AS $$
BEGIN
  PERFORM public.call_edge_function('generate-crypto-signals');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to close signals (called by cron)
CREATE OR REPLACE FUNCTION public.cron_close_signals()
RETURNS void AS $$
BEGIN
  PERFORM public.call_edge_function('close-signals');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Schedule signal generation at 17 WAT times (WAT = UTC+1)
-- 00:35 WAT = 23:35 UTC
SELECT cron.schedule(
  'generate-signals-0035-wat',
  '35 23 * * *',
  $$SELECT public.cron_generate_signals()$$
);

-- 02:00 WAT = 01:00 UTC
SELECT cron.schedule(
  'generate-signals-0200-wat',
  '0 1 * * *',
  $$SELECT public.cron_generate_signals()$$
);

-- 03:00 WAT = 02:00 UTC
SELECT cron.schedule(
  'generate-signals-0300-wat',
  '0 2 * * *',
  $$SELECT public.cron_generate_signals()$$
);

-- 05:00 WAT = 04:00 UTC
SELECT cron.schedule(
  'generate-signals-0500-wat',
  '0 4 * * *',
  $$SELECT public.cron_generate_signals()$$
);

-- 06:30 WAT = 05:30 UTC
SELECT cron.schedule(
  'generate-signals-0630-wat',
  '30 5 * * *',
  $$SELECT public.cron_generate_signals()$$
);

-- 08:00 WAT = 07:00 UTC
SELECT cron.schedule(
  'generate-signals-0800-wat',
  '0 7 * * *',
  $$SELECT public.cron_generate_signals()$$
);

-- 09:30 WAT = 08:30 UTC
SELECT cron.schedule(
  'generate-signals-0930-wat',
  '30 8 * * *',
  $$SELECT public.cron_generate_signals()$$
);

-- 11:00 WAT = 10:00 UTC
SELECT cron.schedule(
  'generate-signals-1100-wat',
  '0 10 * * *',
  $$SELECT public.cron_generate_signals()$$
);

-- 12:30 WAT = 11:30 UTC
SELECT cron.schedule(
  'generate-signals-1230-wat',
  '30 11 * * *',
  $$SELECT public.cron_generate_signals()$$
);

-- 14:00 WAT = 13:00 UTC
SELECT cron.schedule(
  'generate-signals-1400-wat',
  '0 13 * * *',
  $$SELECT public.cron_generate_signals()$$
);

-- 15:30 WAT = 14:30 UTC
SELECT cron.schedule(
  'generate-signals-1530-wat',
  '30 14 * * *',
  $$SELECT public.cron_generate_signals()$$
);

-- 17:00 WAT = 16:00 UTC
SELECT cron.schedule(
  'generate-signals-1700-wat',
  '0 16 * * *',
  $$SELECT public.cron_generate_signals()$$
);

-- 17:30 WAT = 16:30 UTC
SELECT cron.schedule(
  'generate-signals-1730-wat',
  '30 16 * * *',
  $$SELECT public.cron_generate_signals()$$
);

-- 18:35 WAT = 17:35 UTC
SELECT cron.schedule(
  'generate-signals-1835-wat',
  '35 17 * * *',
  $$SELECT public.cron_generate_signals()$$
);

-- 20:00 WAT = 19:00 UTC
SELECT cron.schedule(
  'generate-signals-2000-wat',
  '0 19 * * *',
  $$SELECT public.cron_generate_signals()$$
);

-- 21:35 WAT = 20:35 UTC
SELECT cron.schedule(
  'generate-signals-2135-wat',
  '35 20 * * *',
  $$SELECT public.cron_generate_signals()$$
);

-- 22:30 WAT = 21:30 UTC
SELECT cron.schedule(
  'generate-signals-2230-wat',
  '30 21 * * *',
  $$SELECT public.cron_generate_signals()$$
);

-- 6. Auto-close TP/SL every 30 minutes (24/7)
SELECT cron.schedule(
  'close-signals-every-30min',
  '*/30 * * * *',
  $$SELECT public.cron_close_signals()$$
);

-- 7. Log all cron jobs for verification
DO $$
BEGIN
  RAISE LOG 'Auto-signals cron jobs created: 17 generation times + 1 close-signals every 30min';
END $$;
