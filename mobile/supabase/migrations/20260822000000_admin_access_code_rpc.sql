-- ============================================================
-- Admin access code verification via server-side RPC.
-- Replaces the hardcoded client-side ACCESS_CODE: the plaintext
-- code never ships in the JS bundle.
--
-- Config stored in public.app_config:
--   'admin_access_code' -> sha256 hex digest of the numeric code
--   'admin_emails'      -> comma-separated list of admin emails
-- ============================================================

INSERT INTO public.app_config (key, value)
VALUES ('admin_access_code', 'd956b972ada7ee3b85af6a499c37177ae36e0c0eb16142dd769e75ac45071f3a')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.app_config (key, value)
VALUES ('admin_emails', 'jeronimo.samaina239898@gmail.com')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $outer$
DECLARE
  v_pgcrypto_schema text;
BEGIN
  SELECT n.nspname INTO v_pgcrypto_schema
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'pgcrypto';

  IF v_pgcrypto_schema IS NULL THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
    v_pgcrypto_schema := 'public';
  END IF;

  EXECUTE format($fn$
    CREATE OR REPLACE FUNCTION public.verify_admin_access_code(p_code text)
    RETURNS boolean
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public, %I
    AS $body$
      DECLARE
        v_stored_hash text;
        v_admin_emails text;
        v_caller_email text;
      BEGIN
        SELECT value INTO v_stored_hash FROM public.app_config WHERE key = 'admin_access_code';
        SELECT value INTO v_admin_emails FROM public.app_config WHERE key = 'admin_emails';

        IF v_stored_hash IS NULL OR v_admin_emails IS NULL OR p_code IS NULL THEN
          RETURN false;
        END IF;

        SELECT email INTO v_caller_email FROM auth.users WHERE id = auth.uid();
        IF v_caller_email IS NULL THEN
          RETURN false;
        END IF;

        IF lower(trim(v_caller_email)) <> ALL (
          SELECT lower(trim(x))
          FROM unnest(string_to_array(v_admin_emails, ',')) AS x
        ) THEN
          RETURN false;
        END IF;

        RETURN encode(digest(p_code, 'sha256'), 'hex') = v_stored_hash;
      END;
    $body$;
  $fn$, v_pgcrypto_schema);
END
$outer$;

REVOKE ALL ON FUNCTION public.verify_admin_access_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_admin_access_code(text) TO authenticated;
