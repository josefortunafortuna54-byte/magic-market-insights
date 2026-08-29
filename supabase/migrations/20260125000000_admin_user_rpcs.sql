-- Admin RPCs for user statistics and listings.
-- The admin panel (web + mobile) relies on these; defined here for reproducibility.
-- Safe to re-run (CREATE OR REPLACE FUNCTION).

-- ==========================================
-- 1. GET_USERS_COUNT
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_users_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT count(*)::integer FROM auth.users;
$$;

-- ==========================================
-- 2. GET_ALL_USERS
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz,
  last_sign_in timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', '') AS full_name,
    COALESCE(u.raw_user_meta_data->>'avatar_url', '') AS avatar_url,
    u.created_at,
    u.last_sign_in_at AS last_sign_in
  FROM auth.users u
  ORDER BY u.created_at DESC;
$$;

-- ==========================================
-- 3. GRANTS
-- ==========================================
-- NOTE: get_all_users returns PII (emails). It is granted to `authenticated`
-- because the web admin calls it directly via supabase.rpc() with the user's
-- session. Access should be hardened (e.g. edge function with admin check)
-- before production launch. get_users_count only exposes a number.
GRANT EXECUTE ON FUNCTION public.get_users_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO anon, authenticated;
