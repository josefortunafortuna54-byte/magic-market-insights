-- Fix: store service_role_key in a config table for pg_cron to use
-- The key is set via this migration and read by call_edge_function

CREATE TABLE IF NOT EXISTS public.app_config (
  key   text primary key,
  value text not null
);

-- Insert the Supabase URL (public, safe)
INSERT INTO public.app_config (key, value)
VALUES ('supabase_url', 'https://zwxplzdadgtiohnuotlu.supabase.co')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- The service_role_key must be inserted manually via Supabase SQL Editor:
-- INSERT INTO public.app_config (key, value)
-- VALUES ('service_role_key', 'YOUR_SERVICE_ROLE_KEY_HERE')
-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Update call_edge_function to read from app_config table
CREATE OR REPLACE FUNCTION public.call_edge_function(
  function_name text,
  method text DEFAULT 'POST'
) RETURNS void AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  full_url text;
BEGIN
  SELECT value INTO supabase_url FROM public.app_config WHERE key = 'supabase_url';
  SELECT value INTO service_role_key FROM public.app_config WHERE key = 'service_role_key';

  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://zwxplzdadgtiohnuotlu.supabase.co';
  END IF;

  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE WARNING 'call_edge_function: service_role_key not in app_config. Run the INSERT statement from the migration.';
    RETURN;
  END IF;

  full_url := supabase_url || '/functions/v1/' || function_name;

  PERFORM net.http_post(
    url := full_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', service_role_key,
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  );

  RAISE LOG 'call_edge_function: called % at %', function_name, full_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restrict access: only superuser can read the config
REVOKE ALL ON public.app_config FROM authenticated;
REVOKE ALL ON public.app_config FROM anon;
REVOKE ALL ON public.app_config FROM service_role;
GRANT SELECT ON public.app_config TO postgres;
