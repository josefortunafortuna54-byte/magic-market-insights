-- Fix permissive RLS policies on whatsapp_subscriptions
DROP POLICY IF EXISTS "Allow public insert" ON public.whatsapp_subscriptions;
DROP POLICY IF EXISTS "Allow public read by phone" ON public.whatsapp_subscriptions;
DROP POLICY IF EXISTS "Allow public update" ON public.whatsapp_subscriptions;

-- Create proper RLS policies that require authentication
CREATE POLICY "Authenticated users can insert subscriptions" ON public.whatsapp_subscriptions
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can view own subscriptions" ON public.whatsapp_subscriptions
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can update subscriptions" ON public.whatsapp_subscriptions
    FOR UPDATE TO authenticated
    USING (true);