-- Table to store real-time market prices
CREATE TABLE public.market_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_id UUID REFERENCES public.trading_pairs(id) ON DELETE CASCADE NOT NULL,
    symbol TEXT NOT NULL,
    price NUMERIC NOT NULL,
    change_percent NUMERIC DEFAULT 0,
    high_24h NUMERIC,
    low_24h NUMERIC,
    volume NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(pair_id)
);

-- Table to store automated technical analysis
CREATE TABLE public.market_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_id UUID REFERENCES public.trading_pairs(id) ON DELETE CASCADE NOT NULL,
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL DEFAULT 'H1',
    signal_type TEXT NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'WAIT')),
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    rsi NUMERIC,
    ema_short NUMERIC,
    ema_long NUMERIC,
    trend TEXT CHECK (trend IN ('bullish', 'bearish', 'neutral')),
    entry_price NUMERIC,
    stop_loss NUMERIC,
    take_profit NUMERIC,
    reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
    analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(pair_id, timeframe)
);

-- Enable RLS
ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_analysis ENABLE ROW LEVEL SECURITY;

-- RLS for market_prices: anyone can read, only service role can write
CREATE POLICY "Anyone can view market prices"
ON public.market_prices
FOR SELECT
USING (true);

-- RLS for market_analysis: respect plan restrictions like signals
CREATE POLICY "Anyone can view analysis for their plan"
ON public.market_analysis
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM trading_pairs tp
        WHERE tp.id = market_analysis.pair_id
        AND tp.is_active = true
        AND (
            tp.is_premium = false
            OR get_user_plan(auth.uid()) = 'premium'::plan_type
            OR has_role(auth.uid(), 'admin'::app_role)
        )
    )
);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.market_prices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.market_analysis;

-- Create indexes for better performance
CREATE INDEX idx_market_prices_pair_id ON public.market_prices(pair_id);
CREATE INDEX idx_market_prices_symbol ON public.market_prices(symbol);
CREATE INDEX idx_market_analysis_pair_id ON public.market_analysis(pair_id);
CREATE INDEX idx_market_analysis_timeframe ON public.market_analysis(timeframe);
CREATE INDEX idx_market_analysis_analyzed_at ON public.market_analysis(analyzed_at DESC);