-- Tighten RLS: restrict signal mutations to service_role only.
-- Client-side writes should go through edge functions (service_role).
-- Safe to re-run (DROP IF EXISTS + conditional CREATE).

-- ==========================================
-- 1. SIGNALS — drop permissive policies
-- ==========================================
DROP POLICY IF EXISTS "Authenticated insert signals" ON public.signals;
DROP POLICY IF EXISTS "Authenticated update signals" ON public.signals;
DROP POLICY IF EXISTS "Authenticated delete signals" ON public.signals;

-- service_role can do everything on signals
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access signals' AND tablename = 'signals') THEN
    CREATE POLICY "Service role full access signals" ON public.signals
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ==========================================
-- 2. POSTS — restrict to service_role
-- ==========================================
DROP POLICY IF EXISTS "Authenticated insert posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated update posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated delete posts" ON public.posts;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access posts' AND tablename = 'posts') THEN
    CREATE POLICY "Service role full access posts" ON public.posts
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ==========================================
-- 3. BOOM_HOURS — restrict to service_role
-- ==========================================
DROP POLICY IF EXISTS "Authenticated insert boom_hours" ON public.boom_hours;
DROP POLICY IF EXISTS "Authenticated update boom_hours" ON public.boom_hours;
DROP POLICY IF EXISTS "Authenticated delete boom_hours" ON public.boom_hours;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access boom_hours' AND tablename = 'boom_hours') THEN
    CREATE POLICY "Service role full access boom_hours" ON public.boom_hours
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ==========================================
-- 4. BOOM_TIMES — restrict mutations to service_role
-- ==========================================
DROP POLICY IF EXISTS "Authenticated insert boom_times" ON public.boom_times;
DROP POLICY IF EXISTS "Authenticated update boom_times" ON public.boom_times;
DROP POLICY IF EXISTS "Authenticated delete boom_times" ON public.boom_times;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access boom_times' AND tablename = 'boom_times') THEN
    CREATE POLICY "Service role full access boom_times" ON public.boom_times
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ==========================================
-- 5. SUBSCRIPTIONS — restrict to service_role (Stripe webhook writes these)
-- ==========================================
DROP POLICY IF EXISTS "Authenticated insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Authenticated update subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Authenticated delete subscriptions" ON public.subscriptions;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access subscriptions' AND tablename = 'subscriptions') THEN
    CREATE POLICY "Service role full access subscriptions" ON public.subscriptions
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ==========================================
-- 6. BOOM_COMMENTS — keep authenticated write (users comment)
-- ==========================================
-- Boom comments remain writable by authenticated users (intentional community feature)
-- but restrict delete to own comments only
DROP POLICY IF EXISTS "Authenticated delete boom_comments" ON public.boom_comments;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users delete own boom_comments' AND tablename = 'boom_comments') THEN
    CREATE POLICY "Users delete own boom_comments" ON public.boom_comments
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ==========================================
-- 7. BOOM_VOTES — keep authenticated write, restrict delete to own
-- ==========================================
DROP POLICY IF EXISTS "Authenticated delete boom_votes" ON public.boom_votes;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users delete own boom_votes' AND tablename = 'boom_votes') THEN
    CREATE POLICY "Users delete own boom_votes" ON public.boom_votes
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
