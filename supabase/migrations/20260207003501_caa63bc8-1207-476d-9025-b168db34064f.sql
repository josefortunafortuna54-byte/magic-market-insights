
-- Create trades_history table for signal performance tracking
CREATE TABLE public.trades_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID REFERENCES public.signals(id) ON DELETE CASCADE NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('win', 'loss', 'breakeven')),
  profit_percent NUMERIC NOT NULL DEFAULT 0,
  closed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trades_history ENABLE ROW LEVEL SECURITY;

-- Anyone can view trades history (public proof of results)
CREATE POLICY "Anyone can view trades history"
  ON public.trades_history FOR SELECT
  USING (true);

-- Only admins can manage trades history
CREATE POLICY "Admins can manage trades history"
  ON public.trades_history FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for trades_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades_history;
