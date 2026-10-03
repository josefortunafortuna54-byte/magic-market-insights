-- ============================================================
-- Corrective migration: security schema fixes
--  1. subscriptions: schema (UNIQUE, stripe columns) + RLS + realtime
--  2. whatsapp_subscriptions: lock to service_role (dead table)
--  3. boom_comments / boom_votes: insert own rows only + is_premium server-side
--  4. admins table + is_admin() + admin-only RPCs (get_all_users,
--     get_users_count, get_all_subscriptions, set_admin)
--  5. storage posts bucket: writes via service_role only
--
-- Safe to re-run (DROP IF EXISTS / IF NOT EXISTS everywhere).
-- ============================================================

-- ============================================================
-- 1. SUBSCRIPTIONS
-- ============================================================

-- Missing Stripe columns (idempotent)
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd';

-- UNIQUE(user_id): required by stripe-webhook onConflict("user_id")
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_key' AND conrelid = 'public.subscriptions'::regclass
  ) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Replace public-read with owner-scoped read
DROP POLICY IF EXISTS "Allow public read subscriptions" ON public.subscriptions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own subscriptions' AND tablename = 'subscriptions') THEN
    CREATE POLICY "Users read own subscriptions" ON public.subscriptions
      FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');
  END IF;
END $$;

-- Subscriptions are sensitive: remove from realtime publication
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.subscriptions;
  END IF;
END $$;

-- ============================================================
-- 2. WHATSAPP_SUBSCRIPTIONS — no client usage, restrict to service_role
-- ============================================================
DROP POLICY IF EXISTS "Authenticated insert own subscription" ON public.whatsapp_subscriptions;
DROP POLICY IF EXISTS "Authenticated read own subscriptions" ON public.whatsapp_subscriptions;
DROP POLICY IF EXISTS "Authenticated update own subscription" ON public.whatsapp_subscriptions;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access' AND tablename = 'whatsapp_subscriptions') THEN
    CREATE POLICY "Service role full access" ON public.whatsapp_subscriptions
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================
-- 3. BOOM_COMMENTS / BOOM_VOTES — users can only write own rows
-- ============================================================

DROP POLICY IF EXISTS "Authenticated insert boom_comments" ON public.boom_comments;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users insert own boom_comments' AND tablename = 'boom_comments') THEN
    CREATE POLICY "Users insert own boom_comments" ON public.boom_comments
      FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');
  END IF;
END $$;

DROP POLICY IF EXISTS "Authenticated insert boom_votes" ON public.boom_votes;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users insert own boom_votes' AND tablename = 'boom_votes') THEN
    CREATE POLICY "Users insert own boom_votes" ON public.boom_votes
      FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');
  END IF;
END $$;

-- is_premium must never be forgeable client-side: force it server-side
-- from the actual subscription status.
CREATE OR REPLACE FUNCTION public.sync_comment_premium()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.is_premium := EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = NEW.user_id AND status = 'active'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_comment_premium ON public.boom_comments;
CREATE TRIGGER trg_sync_comment_premium
  BEFORE INSERT ON public.boom_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_comment_premium();

-- ============================================================
-- 4. ADMINS + is_admin() + admin-only RPCs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admins (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access admins' AND tablename = 'admins') THEN
    CREATE POLICY "Service role full access admins" ON public.admins
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Caller is admin? (used by the client + other RPCs)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE email = (auth.jwt() ->> 'email')
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Admin-only: full user list (as JSON array)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(u)), '[]'::jsonb)
    FROM (
      SELECT id, email, created_at, last_sign_in_at AS last_sign_in
      FROM auth.users
      ORDER BY created_at DESC
    ) u
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_all_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;

-- Admin-only: total user count
CREATE OR REPLACE FUNCTION public.get_users_count()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN (SELECT count(*) FROM auth.users);
END;
$$;

REVOKE ALL ON FUNCTION public.get_users_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_users_count() TO authenticated;

-- Admin-only: all subscriptions (as JSON array)
CREATE OR REPLACE FUNCTION public.get_all_subscriptions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb)
    FROM public.subscriptions s
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_all_subscriptions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_subscriptions() TO authenticated;

-- Admin-only: promote/demote admins (service_role can bootstrap first admin)
CREATE OR REPLACE FUNCTION public.set_admin(target_email text, is_admin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF is_admin THEN
    INSERT INTO public.admins (email) VALUES (lower(trim(target_email)))
    ON CONFLICT (email) DO NOTHING;
  ELSE
    DELETE FROM public.admins WHERE email = lower(trim(target_email));
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_admin(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_admin(text, boolean) TO authenticated;

-- ============================================================
-- 5. STORAGE 'posts' bucket — writes via service_role only
--    (uploads go through the admin-manage edge function)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated upload posts bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete posts bucket" ON storage.objects;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role upload posts bucket' AND tablename = 'objects') THEN
    CREATE POLICY "Service role upload posts bucket" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'posts' AND auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role delete posts bucket' AND tablename = 'objects') THEN
    CREATE POLICY "Service role delete posts bucket" ON storage.objects
      FOR DELETE USING (bucket_id = 'posts' AND auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================
-- Note: seed the first admin from the Supabase SQL Editor:
--   SELECT public.set_admin('owner@example.com', true);
-- (or run it as service_role / with an existing admin's token)
-- ============================================================
