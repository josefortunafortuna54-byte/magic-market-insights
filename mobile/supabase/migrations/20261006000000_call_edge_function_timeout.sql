-- Corrige o timeout de 5000 ms do pg_net em call_edge_function.
--
-- net.http_post sem timeout_milliseconds usa o default do pg_net (5000 ms).
-- O close-signals v26 (isServiceRoleToken) ultrapassa esse limite em producao:
-- o pedido e abortado a meio com "Timeout of 5000 ms reached", o corpo da
-- resposta nunca chega, e o tique fica sem observabilidade -- o cron regista
-- 'succeeded' mesmo quando a funcao nem correu. 30 s cobre o pior caso
-- observado sem prender o scheduler, porque pg_cron corre cada tique numa
-- transacao propria.
--
-- Assinatura identica a de 20260819020000_fix_cron_settings.sql (a ultima que
-- definiu a funcao): CREATE OR REPLACE sem mudar parametros.
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
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );

  RAISE LOG 'call_edge_function: called % at %', function_name, full_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
