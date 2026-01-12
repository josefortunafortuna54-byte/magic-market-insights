-- Create table for WhatsApp alert subscriptions
CREATE TABLE public.whatsapp_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  pairs TEXT[] DEFAULT ARRAY['EUR/USD'],
  timeframes TEXT[] DEFAULT ARRAY['H1'],
  min_confidence INTEGER DEFAULT 70,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for demo purposes - in production you'd want auth)
CREATE POLICY "Allow public insert" ON public.whatsapp_subscriptions
  FOR INSERT WITH CHECK (true);

-- Allow anyone to read their own subscription by phone
CREATE POLICY "Allow public read by phone" ON public.whatsapp_subscriptions
  FOR SELECT USING (true);

-- Allow anyone to update their subscription
CREATE POLICY "Allow public update" ON public.whatsapp_subscriptions
  FOR UPDATE USING (true);

-- Create signals table for tracking generated signals
CREATE TABLE public.signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pair TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'AGUARDAR')),
  confidence INTEGER NOT NULL,
  entry_price DECIMAL NOT NULL,
  stop_loss DECIMAL NOT NULL,
  take_profit DECIMAL NOT NULL,
  reasons TEXT[] NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'tp', 'sl')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for signals
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

-- Allow public read for signals
CREATE POLICY "Allow public read signals" ON public.signals
  FOR SELECT USING (true);

-- Enable realtime for signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;