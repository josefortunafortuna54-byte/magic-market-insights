-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create plan type enum
CREATE TYPE public.plan_type AS ENUM ('free', 'premium');

-- Create user roles table (security best practice)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    email TEXT,
    plan plan_type NOT NULL DEFAULT 'free',
    plan_expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trading pairs table
CREATE TABLE public.trading_pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'forex',
    is_premium BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Drop existing signals table and recreate with proper structure
DROP TABLE IF EXISTS public.signals CASCADE;

CREATE TABLE public.signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_id UUID REFERENCES public.trading_pairs(id) ON DELETE CASCADE NOT NULL,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'WAIT')),
    entry_price NUMERIC NOT NULL,
    stop_loss NUMERIC NOT NULL,
    take_profit NUMERIC NOT NULL,
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    timeframe TEXT NOT NULL DEFAULT 'H1',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'tp', 'sl', 'cancelled')),
    reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Create settings table for admin configurations
CREATE TABLE public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user plan
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id UUID)
RETURNS plan_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan FROM public.profiles WHERE user_id = _user_id AND is_active = true),
    'free'::plan_type
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all profiles" ON public.profiles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for trading_pairs (public read, admin write)
CREATE POLICY "Anyone can view active pairs" ON public.trading_pairs
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage pairs" ON public.trading_pairs
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for signals
CREATE POLICY "Users can view signals for their plan" ON public.signals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.trading_pairs tp 
            WHERE tp.id = pair_id 
            AND tp.is_active = true
            AND (
                tp.is_premium = false 
                OR public.get_user_plan(auth.uid()) = 'premium'
                OR public.has_role(auth.uid(), 'admin')
            )
        )
    );

CREATE POLICY "Admins can manage signals" ON public.signals
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for app_settings
CREATE POLICY "Anyone can view settings" ON public.app_settings
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage settings" ON public.app_settings
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default trading pairs
INSERT INTO public.trading_pairs (symbol, name, category, is_premium) VALUES
    ('EURUSD', 'Euro / US Dollar', 'forex', false),
    ('GBPUSD', 'British Pound / US Dollar', 'forex', false),
    ('USDJPY', 'US Dollar / Japanese Yen', 'forex', false),
    ('XAUUSD', 'Gold / US Dollar', 'commodity', true),
    ('BTCUSD', 'Bitcoin / US Dollar', 'crypto', true);

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES
    ('default_confidence', '75'),
    ('default_timeframe', '"H1"'),
    ('global_message', '""');

-- Enable realtime for signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;