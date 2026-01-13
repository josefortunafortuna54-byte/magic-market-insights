-- Add user_id to whatsapp_subscriptions for proper RLS
ALTER TABLE public.whatsapp_subscriptions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop current policies
DROP POLICY IF EXISTS "Authenticated users can insert subscriptions" ON public.whatsapp_subscriptions;
DROP POLICY IF EXISTS "Authenticated users can view own subscriptions" ON public.whatsapp_subscriptions;
DROP POLICY IF EXISTS "Authenticated users can update subscriptions" ON public.whatsapp_subscriptions;

-- Create proper RLS policies tied to user_id
CREATE POLICY "Users can insert own subscriptions" ON public.whatsapp_subscriptions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own subscriptions" ON public.whatsapp_subscriptions
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.whatsapp_subscriptions
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" ON public.whatsapp_subscriptions
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);