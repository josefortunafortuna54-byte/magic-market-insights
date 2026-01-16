import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TradingPair {
  id: string;
  symbol: string;
  category: string;
}

interface OHLCData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  datetime: string;
}

interface AnalysisResult {
  pair_id: string;
  symbol: string;
  timeframe: string;
  signal_type: "BUY" | "SELL" | "WAIT";
  confidence: number;
  rsi: number;
  ema_short: number;
  ema_long: number;
  trend: "bullish" | "bearish" | "neutral";
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  reasons: string[];
}

// Format symbol for Twelve Data API
function formatSymbolForApi(symbol: string, category: string): string {
  const clean = symbol.replace("/", "");
  if (category === "crypto") {
    return symbol.includes("/") ? symbol : `${clean.slice(0, 3)}/${clean.slice(3)}`;
  }
  if (clean === "XAUUSD") return "XAU/USD";
  return symbol.includes("/") ? symbol : `${clean.slice(0, 3)}/${clean.slice(3)}`;
}

// Map timeframe to Twelve Data interval
function mapTimeframe(timeframe: string): string {
  const mapping: Record<string, string> = {
    M5: "5min",
    M15: "15min",
    H1: "1h",
    H4: "4h",
    D1: "1day",
  };
  return mapping[timeframe] || "1h";
}

// Calculate RSI
function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// Calculate EMA
function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1];

  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }

  return ema;
}

// Determine trend
function determineTrend(
  emaShort: number,
  emaLong: number,
  currentPrice: number
): "bullish" | "bearish" | "neutral" {
  const shortAboveLong = emaShort > emaLong;
  const priceAboveEmas = currentPrice > emaShort && currentPrice > emaLong;
  const priceBelowEmas = currentPrice < emaShort && currentPrice < emaLong;

  if (shortAboveLong && priceAboveEmas) return "bullish";
  if (!shortAboveLong && priceBelowEmas) return "bearish";
  return "neutral";
}

// Generate analysis
function generateAnalysis(
  pair: TradingPair,
  ohlcData: OHLCData[],
  timeframe: string
): AnalysisResult {
  const closes = ohlcData.map((d) => d.close);
  const currentPrice = closes[closes.length - 1];
  const highs = ohlcData.map((d) => d.high);
  const lows = ohlcData.map((d) => d.low);

  // Calculate indicators
  const rsi = calculateRSI(closes);
  const emaShort = calculateEMA(closes, 21);
  const emaLong = calculateEMA(closes, 50);
  const trend = determineTrend(emaShort, emaLong, currentPrice);

  // Calculate ATR for stop loss and take profit
  const atr = calculateATR(highs, lows, closes);

  // Generate signal
  const reasons: string[] = [];
  let signalType: "BUY" | "SELL" | "WAIT" = "WAIT";
  let confidence = 50;

  // RSI analysis
  if (rsi < 30) {
    reasons.push(`RSI(14) em sobrevenda (${rsi.toFixed(1)}) - potencial reversão bullish`);
    confidence += 15;
  } else if (rsi > 70) {
    reasons.push(`RSI(14) em sobrecompra (${rsi.toFixed(1)}) - potencial reversão bearish`);
    confidence += 15;
  } else if (rsi > 45 && rsi < 55) {
    reasons.push(`RSI(14) neutro (${rsi.toFixed(1)}) - aguardar confirmação`);
  }

  // EMA analysis
  if (emaShort > emaLong) {
    reasons.push(`EMA 21 acima da EMA 50 - tendência de alta`);
    confidence += 10;
  } else if (emaShort < emaLong) {
    reasons.push(`EMA 21 abaixo da EMA 50 - tendência de baixa`);
    confidence += 10;
  }

  // Trend analysis
  if (trend === "bullish") {
    reasons.push("Preço acima das médias móveis - momentum bullish");
    confidence += 10;
  } else if (trend === "bearish") {
    reasons.push("Preço abaixo das médias móveis - momentum bearish");
    confidence += 10;
  }

  // Determine final signal
  if (rsi < 35 && trend !== "bearish" && emaShort > emaLong) {
    signalType = "BUY";
    confidence = Math.min(95, confidence + 15);
  } else if (rsi > 65 && trend !== "bullish" && emaShort < emaLong) {
    signalType = "SELL";
    confidence = Math.min(95, confidence + 15);
  } else if (rsi < 40 && emaShort > emaLong) {
    signalType = "BUY";
    confidence = Math.min(85, confidence);
  } else if (rsi > 60 && emaShort < emaLong) {
    signalType = "SELL";
    confidence = Math.min(85, confidence);
  }

  // Calculate entry, stop loss, and take profit
  const atrMultiplier = 1.5;
  let stopLoss: number;
  let takeProfit: number;

  if (signalType === "BUY") {
    stopLoss = currentPrice - atr * atrMultiplier;
    takeProfit = currentPrice + atr * atrMultiplier * 2;
  } else if (signalType === "SELL") {
    stopLoss = currentPrice + atr * atrMultiplier;
    takeProfit = currentPrice - atr * atrMultiplier * 2;
  } else {
    stopLoss = currentPrice - atr * atrMultiplier;
    takeProfit = currentPrice + atr * atrMultiplier;
  }

  // Add disclaimer reason
  if (signalType === "WAIT") {
    reasons.push("Condições de mercado não claras - aguardar melhor setup");
    confidence = Math.max(30, Math.min(50, confidence));
  }

  return {
    pair_id: pair.id,
    symbol: pair.symbol.replace("/", ""),
    timeframe,
    signal_type: signalType,
    confidence: Math.round(confidence),
    rsi: Math.round(rsi * 100) / 100,
    ema_short: Math.round(emaShort * 100000) / 100000,
    ema_long: Math.round(emaLong * 100000) / 100000,
    trend,
    entry_price: Math.round(currentPrice * 100000) / 100000,
    stop_loss: Math.round(stopLoss * 100000) / 100000,
    take_profit: Math.round(takeProfit * 100000) / 100000,
    reasons,
  };
}

// Calculate ATR (Average True Range)
function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number {
  const trueRanges: number[] = [];

  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trueRanges.push(tr);
  }

  if (trueRanges.length < period) {
    return trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length || 0;
  }

  return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
}

async function fetchOHLCData(
  symbol: string,
  category: string,
  interval: string,
  apiKey: string
): Promise<OHLCData[] | null> {
  const formattedSymbol = formatSymbolForApi(symbol, category);

  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(
      formattedSymbol
    )}&interval=${interval}&outputsize=50&apikey=${apiKey}`;

    console.log(`Fetching OHLC data for ${symbol} (${interval})`);

    const response = await fetch(url);
    const data = await response.json();

    if (data.code || !data.values) {
      console.error(`Error fetching OHLC for ${symbol}:`, data);
      return null;
    }

    // Convert and reverse (API returns newest first)
    const ohlc: OHLCData[] = data.values
      .map((v: any) => ({
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
        volume: parseFloat(v.volume) || 0,
        datetime: v.datetime,
      }))
      .reverse();

    return ohlc;
  } catch (error) {
    console.error(`Error fetching OHLC for ${symbol}:`, error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twelveDataApiKey = Deno.env.get("TWELVE_DATA_API_KEY")!;

    if (!twelveDataApiKey) {
      throw new Error("TWELVE_DATA_API_KEY not configured");
    }

    // Parse request body for optional timeframe
    let timeframe = "H1";
    try {
      const body = await req.json();
      if (body.timeframe) timeframe = body.timeframe;
    } catch {
      // Use default timeframe
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active trading pairs
    const { data: pairs, error: pairsError } = await supabase
      .from("trading_pairs")
      .select("*")
      .eq("is_active", true);

    if (pairsError) {
      throw pairsError;
    }

    console.log(`Analyzing ${pairs?.length || 0} pairs for timeframe ${timeframe}`);

    const results: AnalysisResult[] = [];
    const interval = mapTimeframe(timeframe);

    for (const pair of pairs || []) {
      const ohlcData = await fetchOHLCData(
        pair.symbol,
        pair.category,
        interval,
        twelveDataApiKey
      );

      if (ohlcData && ohlcData.length >= 20) {
        const analysis = generateAnalysis(pair, ohlcData, timeframe);

        // Upsert to database
        const { error: upsertError } = await supabase.from("market_analysis").upsert(
          {
            pair_id: analysis.pair_id,
            symbol: analysis.symbol,
            timeframe: analysis.timeframe,
            signal_type: analysis.signal_type,
            confidence: analysis.confidence,
            rsi: analysis.rsi,
            ema_short: analysis.ema_short,
            ema_long: analysis.ema_long,
            trend: analysis.trend,
            entry_price: analysis.entry_price,
            stop_loss: analysis.stop_loss,
            take_profit: analysis.take_profit,
            reasons: analysis.reasons,
            analyzed_at: new Date().toISOString(),
          },
          { onConflict: "pair_id,timeframe" }
        );

        if (upsertError) {
          console.error(`Error upserting analysis for ${pair.symbol}:`, upsertError);
        } else {
          results.push(analysis);
          console.log(
            `Analysis for ${pair.symbol}: ${analysis.signal_type} (${analysis.confidence}%)`
          );
        }
      }

      // Delay to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`Successfully analyzed ${results.length} pairs`);

    return new Response(
      JSON.stringify({
        success: true,
        timeframe,
        analyzed: results.length,
        analyses: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-market function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
