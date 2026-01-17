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
  signal_type: "BUY" | "SELL" | "HOLD";
  confidence: number;
  rsi: number;
  ema_20: number;
  current_price: number;
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

// Generate analysis based on the new rules
// BUY: RSI < 30 (oversold) AND Price > EMA 20 (potential bullish reversal)
// SELL: RSI > 70 (overbought) AND Price < EMA 20 (potential bearish reversal)
// HOLD: Conditions not fully met
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
  const ema20 = calculateEMA(closes, 20);
  
  // Calculate ATR for stop loss and take profit
  const atr = calculateATR(highs, lows, closes);

  // Determine trend based on price vs EMA 20
  const trend: "bullish" | "bearish" | "neutral" = 
    currentPrice > ema20 ? "bullish" : 
    currentPrice < ema20 ? "bearish" : "neutral";

  // Apply the decision rules
  const reasons: string[] = [];
  let signalType: "BUY" | "SELL" | "HOLD" = "HOLD";
  let confidence = 0;

  // RSI analysis
  const isOversold = rsi < 30;
  const isOverbought = rsi > 70;
  const priceAboveEma = currentPrice > ema20;
  const priceBelowEma = currentPrice < ema20;

  // BUY Signal: RSI < 30 AND Price > EMA 20
  if (isOversold && priceAboveEma) {
    signalType = "BUY";
    
    // Calculate confidence based on how strong the signal is
    // Base confidence starts at 80%
    confidence = 80;
    
    // Add more confidence based on RSI extremity (lower RSI = stronger oversold)
    const rsiStrength = (30 - rsi) / 30; // 0 to 1 scale
    confidence += rsiStrength * 10;
    
    // Add confidence based on price distance above EMA
    const priceDistancePercent = ((currentPrice - ema20) / ema20) * 100;
    if (priceDistancePercent > 0.5) confidence += 5;
    
    confidence = Math.min(95, Math.round(confidence));
    
    reasons.push(`✅ RSI(14) em ${rsi.toFixed(1)} - mercado SOBREVENDIDO (< 30)`);
    reasons.push(`✅ Preço ${currentPrice.toFixed(5)} ACIMA da EMA 20 (${ema20.toFixed(5)})`);
    reasons.push(`📈 Possível reversão de ALTA detectada`);
    reasons.push(`🎯 Confiança: ${confidence >= 80 ? 'FORTE' : 'MODERADA'} (${confidence}%)`);
  }
  // SELL Signal: RSI > 70 AND Price < EMA 20
  else if (isOverbought && priceBelowEma) {
    signalType = "SELL";
    
    // Base confidence starts at 80%
    confidence = 80;
    
    // Add more confidence based on RSI extremity (higher RSI = stronger overbought)
    const rsiStrength = (rsi - 70) / 30; // 0 to 1 scale
    confidence += rsiStrength * 10;
    
    // Add confidence based on price distance below EMA
    const priceDistancePercent = ((ema20 - currentPrice) / ema20) * 100;
    if (priceDistancePercent > 0.5) confidence += 5;
    
    confidence = Math.min(95, Math.round(confidence));
    
    reasons.push(`✅ RSI(14) em ${rsi.toFixed(1)} - mercado SOBRECOMPRADO (> 70)`);
    reasons.push(`✅ Preço ${currentPrice.toFixed(5)} ABAIXO da EMA 20 (${ema20.toFixed(5)})`);
    reasons.push(`📉 Possível reversão de BAIXA detectada`);
    reasons.push(`🎯 Confiança: ${confidence >= 80 ? 'FORTE' : 'MODERADA'} (${confidence}%)`);
  }
  // HOLD Signal: Conditions not fully met
  else {
    signalType = "HOLD";
    
    // Calculate confidence based on how close we are to a signal
    // If one condition is met, confidence is higher (50-70%)
    // If no conditions are met, confidence is low (< 50%)
    
    if (isOversold) {
      confidence = 55;
      reasons.push(`⚠️ RSI(14) em ${rsi.toFixed(1)} - SOBREVENDIDO`);
      reasons.push(`❌ Preço ${priceBelowEma ? 'ABAIXO' : 'na'} EMA 20 - aguardar confirmação`);
    } else if (isOverbought) {
      confidence = 55;
      reasons.push(`⚠️ RSI(14) em ${rsi.toFixed(1)} - SOBRECOMPRADO`);
      reasons.push(`❌ Preço ${priceAboveEma ? 'ACIMA' : 'na'} EMA 20 - aguardar confirmação`);
    } else if (priceAboveEma) {
      confidence = 45;
      reasons.push(`✅ Preço ACIMA da EMA 20 (tendência de alta)`);
      reasons.push(`❌ RSI(14) em ${rsi.toFixed(1)} - não está em sobrevenda`);
    } else if (priceBelowEma) {
      confidence = 45;
      reasons.push(`✅ Preço ABAIXO da EMA 20 (tendência de baixa)`);
      reasons.push(`❌ RSI(14) em ${rsi.toFixed(1)} - não está em sobrecompra`);
    } else {
      confidence = 35;
      reasons.push(`⚠️ RSI(14) em ${rsi.toFixed(1)} - zona neutra`);
      reasons.push(`⚠️ Preço próximo à EMA 20 - sem tendência clara`);
    }
    
    reasons.push(`⏳ AGUARDAR - condições de entrada não confirmadas`);
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
    // For HOLD, show potential levels
    stopLoss = currentPrice - atr * atrMultiplier;
    takeProfit = currentPrice + atr * atrMultiplier;
  }

  return {
    pair_id: pair.id,
    symbol: pair.symbol.replace("/", ""),
    timeframe,
    signal_type: signalType,
    confidence,
    rsi: Math.round(rsi * 100) / 100,
    ema_20: Math.round(ema20 * 100000) / 100000,
    current_price: Math.round(currentPrice * 100000) / 100000,
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
            ema_short: analysis.ema_20, // Using ema_20 as ema_short for compatibility
            ema_long: analysis.ema_20, // Same value for now
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
