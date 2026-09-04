-- Fix: complete the cron signal generation pipeline
-- Root cause: service_role_key was never inserted into app_config,
-- causing call_edge_function() to silently RETURN on every pg_cron invocation.

-- 1. Ensure service_role_key is set (value inserted via Management API, not hardcoded here)
-- Run manually after deployment:
-- INSERT INTO public.app_config (key, value)
-- VALUES ('service_role_key', 'YOUR_SERVICE_ROLE_KEY')
-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. Fix signals check constraint to allow 'expired' status
ALTER TABLE public.signals DROP CONSTRAINT IF EXISTS signals_status_check;
ALTER TABLE public.signals ADD CONSTRAINT signals_status_check
  CHECK (status IN ('pending', 'active', 'tp', 'sl', 'expired'));

-- 3. Remove stale cron jobs that called wrong function names (safe if missing)
DO $$
DECLARE
  stale text[] := ARRAY['gerar-sinais-hora', 'generate-signals-hourly'];
  s text;
BEGIN
  FOREACH s IN ARRAY stale LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = s) THEN
      PERFORM cron.unschedule(s);
    END IF;
  END LOOP;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. Ensure the main generate-crypto-signals crons exist
-- (17 WAT times defined in 20260818000000_auto_signals_cron.sql; WAT = UTC+1)
DO $$
DECLARE
  scheds text[] := ARRAY[
    'generate-signals-0035-wat|35 23 * * *',
    'generate-signals-0200-wat|0 1 * * *',
    'generate-signals-0300-wat|0 2 * * *',
    'generate-signals-0500-wat|0 4 * * *',
    'generate-signals-0630-wat|30 5 * * *',
    'generate-signals-0800-wat|0 7 * * *',
    'generate-signals-0930-wat|30 8 * * *',
    'generate-signals-1100-wat|0 10 * * *',
    'generate-signals-1230-wat|30 11 * * *',
    'generate-signals-1400-wat|0 13 * * *',
    'generate-signals-1530-wat|30 14 * * *',
    'generate-signals-1700-wat|0 16 * * *',
    'generate-signals-1730-wat|30 16 * * *',
    'generate-signals-1835-wat|35 17 * * *',
    'generate-signals-2000-wat|0 19 * * *',
    'generate-signals-2135-wat|35 20 * * *',
    'generate-signals-2230-wat|30 21 * * *'
  ];
  s text; n text; c text;
BEGIN
  FOREACH s IN ARRAY scheds LOOP
    n := split_part(s, '|', 1);
    c := split_part(s, '|', 2);
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = n) THEN
      PERFORM cron.schedule(n, c, 'SELECT public.cron_generate_signals()');
    END IF;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'close-signals-every-30min') THEN
    PERFORM cron.schedule('close-signals-every-30min', '*/30 * * * *', 'SELECT public.cron_close_signals()');
  END IF;
END $$;

-- 5. Warn loudly if the pipeline secret is still missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_config WHERE key = 'service_role_key' AND value <> '') THEN
    RAISE WARNING 'fix_cron_pipeline: app_config.service_role_key ainda nao foi inserido — os crons vao falhar em silencio';
  END IF;
END $$;
