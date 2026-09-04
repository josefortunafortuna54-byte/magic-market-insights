-- Harden RLS + fix subscriptions schema/webhook mismatch
-- Safe to re-run (DROP IF EXISTS + conditional CREATE)

-- ==========================================
-- 1. SUBSCRIPTIONS — schema + own-read RLS
-- ==========================================
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd';

-- Dedupe before adding the UNIQUE(user_id) constraint (keep latest per user)
DELETE FROM public.subscriptions a
USING public.subscriptions b
WHERE a.user_id = b.user_id
  AND (a.created_at, a.id) < (b.created_at, b.id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_key') THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Any anon/authenticated client can currently read every user's Stripe data
DROP POLICY IF EXISTS "Allow public read subscriptions" ON public.subscriptions;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own subscriptions' AND tablename = 'subscriptions') THEN
    CREATE POLICY "Users read own subscriptions" ON public.subscriptions
      FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');
  END IF;
END $$;

-- ==========================================
-- 2. BOOM_COMMENTS — own-insert + server-side author
-- ==========================================
-- Prevent spoofing other user_ids on comments
DROP POLICY IF EXISTS "Authenticated insert boom_comments" ON public.boom_comments;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users insert own boom_comments' AND tablename = 'boom_comments') THEN
    CREATE POLICY "Users insert own boom_comments" ON public.boom_comments
      FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');
  END IF;
END $$;

-- Force author identity and is_premium server-side (ignore client-supplied values)
CREATE OR REPLACE FUNCTION public.force_boom_comment_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_premium boolean;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
    SELECT EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = NEW.user_id AND s.status = 'active'
    ) INTO v_premium;
    NEW.is_premium := v_premium;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_force_boom_comment_author ON public.boom_comments;
CREATE TRIGGER trg_force_boom_comment_author
BEFORE INSERT ON public.boom_comments
FOR EACH ROW EXECUTE FUNCTION public.force_boom_comment_author();

-- ==========================================
-- 3. BOOM_VOTES — own-insert/update (upsert toggling needs UPDATE policy)
-- ==========================================
DROP POLICY IF EXISTS "Authenticated insert boom_votes" ON public.boom_votes;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users insert own boom_votes' AND tablename = 'boom_votes') THEN
    CREATE POLICY "Users insert own boom_votes" ON public.boom_votes
      FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users update own boom_votes' AND tablename = 'boom_votes') THEN
    CREATE POLICY "Users update own boom_votes" ON public.boom_votes
      FOR UPDATE USING (auth.uid() = user_id OR auth.role() = 'service_role')
      WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');
  END IF;
END $$;

-- ==========================================
-- 4. STORAGE — 'posts' bucket writes are service_role only (via admin-manage)
-- ==========================================
DROP POLICY IF EXISTS "Authenticated upload posts bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete posts bucket" ON storage.objects;

-- ==========================================
-- 5. WHATSAPP_SUBSCRIPTIONS — tie to user + own-only RLS
-- ==========================================
ALTER TABLE public.whatsapp_subscriptions ADD COLUMN IF NOT EXISTS user_id UUID;

DROP POLICY IF EXISTS "Authenticated insert own subscription" ON public.whatsapp_subscriptions;
DROP POLICY IF EXISTS "Authenticated read own subscriptions" ON public.whatsapp_subscriptions;
DROP POLICY IF EXISTS "Authenticated update own subscription" ON public.whatsapp_subscriptions;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users insert own whatsapp_subscriptions' AND tablename = 'whatsapp_subscriptions') THEN
    CREATE POLICY "Users insert own whatsapp_subscriptions" ON public.whatsapp_subscriptions
      FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own whatsapp_subscriptions' AND tablename = 'whatsapp_subscriptions') THEN
    CREATE POLICY "Users read own whatsapp_subscriptions" ON public.whatsapp_subscriptions
      FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users update own whatsapp_subscriptions' AND tablename = 'whatsapp_subscriptions') THEN
    CREATE POLICY "Users update own whatsapp_subscriptions" ON public.whatsapp_subscriptions
      FOR UPDATE USING (auth.uid() = user_id OR auth.role() = 'service_role')
      WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');
  END IF;
END $$;

-- ==========================================
-- 6. RPC grants — stop PII leakage via anon
-- ==========================================
-- get_all_users returns all user emails (PII); the app uses admin-manage list_users instead
REVOKE ALL ON FUNCTION public.get_all_users() FROM anon, authenticated, PUBLIC;

-- get_users_count is only used by the authenticated admin panel; revoke from anon
REVOKE ALL ON FUNCTION public.get_users_count() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_users_count() TO authenticated;
