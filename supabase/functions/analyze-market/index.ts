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

interface AISettings {
  rsi_oversold: number;
  rsi_overbought: number;
  rsi_period: number;
  ema_period: number;
  min_confidence_buy: number;
  min_confidence_sell: number;
  stop_loss_percent: number;
  take_profit_percent: number;
  enabled_timeframes: string[];
  default_timeframe: string;
  pair_overrides: Record<string, Partial<AISettings>>;
}

const DEFAULT_SETTINGS: AISettings = {
  rsi_oversold: 30,
  rsi_overbought: 70,
  rsi_period: 14,
  ema_period: 20,
  min_confidence_buy: 70,
  min_confidence_sell: 70,
  stop_loss_percent: 0.5,
  take_profit_percent: 1.0,
  enabled_timeframes: ["M15", "H1", "H4", "D1"],
  default_timeframe: "H1",
  pair_overrides: {},
};

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
    M1: "1min",
    M5: "5min",
    M15: "15min",
    M30: "30min",
    H1: "1h",
    H4: "4h",
    D1: "1day",
    W1: "1week",
  };
  return mapping[timeframe] || "1h";
}

// Calculate RSI with configurable period
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

// Calculate EMA with configurable period
function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1];

  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }

  return ema;
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

// Get effective settings for a pair (with overrides)
function getEffectiveSettings(symbol: string, globalSettings: AISettings): AISettings {
  const cleanSymbol = symbol.replace("/", "");
  const override = globalSettings.pair_overrides[cleanSymbol] || {};
  return { ...globalSettings, ...override };
}

// Generate analysis based on configurable rules
function generateAnalysis(
  pair: TradingPair,
  ohlcData: OHLCData[],
  timeframe: string,
  settings: AISettings
): AnalysisResult {
  const closes = ohlcData.map((d) => d.close);
  const currentPrice = closes[closes.length - 1];
  const highs = ohlcData.map((d) => d.high);
  const lows = ohlcData.map((d) => d.low);

  // Get effective settings for this pair
  const effectiveSettings = getEffectiveSettings(pair.symbol, settings);

  // Calculate indicators with configured periods
  const rsi = calculateRSI(closes, effectiveSettings.rsi_period);
  const ema = calculateEMA(closes, effectiveSettings.ema_period);
  
  // Calculate ATR for stop loss and take profit
  const atr = calculateATR(highs, lows, closes);

  // Determine trend based on price vs EMA
  const trend: "bullish" | "bearish" | "neutral" = 
    currentPrice > ema ? "bullish" : 
    currentPrice < ema ? "bearish" : "neutral";

  // Apply the decision rules with configurable thresholds
  const reasons: string[] = [];
  let signalType: "BUY" | "SELL" | "HOLD" = "HOLD";
  let confidence = 0;

  // RSI analysis with configurable thresholds
  const isOversold = rsi < effectiveSettings.rsi_oversold;
  const isOverbought = rsi > effectiveSettings.rsi_overbought;
  const priceAboveEma = currentPrice > ema;
  const priceBelowEma = currentPrice < ema;

  // BUY Signal: RSI < oversold threshold AND Price > EMA
  if (isOversold && priceAboveEma) {
    signalType = "BUY";
    
    // Calculate confidence based on how strong the signal is
    confidence = 80;
    
    // Add more confidence based on RSI extremity
    const rsiStrength = (effectiveSettings.rsi_oversold - rsi) / effectiveSettings.rsi_oversold;
    confidence += rsiStrength * 10;
    
    // Add confidence based on price distance above EMA
    const priceDistancePercent = ((currentPrice - ema) / ema) * 100;
    if (priceDistancePercent > 0.5) confidence += 5;
    
    confidence = Math.min(95, Math.round(confidence));
    
    reasons.push(`✅ RSI(${effectiveSettings.rsi_period}) em ${rsi.toFixed(1)} - mercado SOBREVENDIDO (< ${effectiveSettings.rsi_oversold})`);
    reasons.push(`✅ Preço ${currentPrice.toFixed(5)} ACIMA da EMA ${effectiveSettings.ema_period} (${ema.toFixed(5)})`);
    reasons.push(`📈 Possível reversão de ALTA detectada`);
    reasons.push(`🎯 Confiança: ${confidence >= 80 ? 'FORTE' : 'MODERADA'} (${confidence}%)`);
  }
  // SELL Signal: RSI > overbought threshold AND Price < EMA
  else if (isOverbought && priceBelowEma) {
    signalType = "SELL";
    
    confidence = 80;
    
    const rsiStrength = (rsi - effectiveSettings.rsi_overbought) / (100 - effectiveSettings.rsi_overbought);
    confidence += rsiStrength * 10;
    
    const priceDistancePercent = ((ema - currentPrice) / ema) * 100;
    if (priceDistancePercent > 0.5) confidence += 5;
    
    confidence = Math.min(95, Math.round(confidence));
    
    reasons.push(`✅ RSI(${effectiveSettings.rsi_period}) em ${rsi.toFixed(1)} - mercado SOBRECOMPRADO (> ${effectiveSettings.rsi_overbought})`);
    reasons.push(`✅ Preço ${currentPrice.toFixed(5)} ABAIXO da EMA ${effectiveSettings.ema_period} (${ema.toFixed(5)})`);
    reasons.push(`📉 Possível reversão de BAIXA detectada`);
    reasons.push(`🎯 Confiança: ${confidence >= 80 ? 'FORTE' : 'MODERADA'} (${confidence}%)`);
  }
  // HOLD Signal: Conditions not fully met
  else {
    signalType = "HOLD";
    
    if (isOversold) {
      confidence = 55;
      reasons.push(`⚠️ RSI(${effectiveSettings.rsi_period}) em ${rsi.toFixed(1)} - SOBREVENDIDO`);
      reasons.push(`❌ Preço ${priceBelowEma ? 'ABAIXO' : 'na'} EMA ${effectiveSettings.ema_period} - aguardar confirmação`);
    } else if (isOverbought) {
      confidence = 55;
      reasons.push(`⚠️ RSI(${effectiveSettings.rsi_period}) em ${rsi.toFixed(1)} - SOBRECOMPRADO`);
      reasons.push(`❌ Preço ${priceAboveEma ? 'ACIMA' : 'na'} EMA ${effectiveSettings.ema_period} - aguardar confirmação`);
    } else if (priceAboveEma) {
      confidence = 45;
      reasons.push(`✅ Preço ACIMA da EMA ${effectiveSettings.ema_period} (tendência de alta)`);
      reasons.push(`❌ RSI(${effectiveSettings.rsi_period}) em ${rsi.toFixed(1)} - não está em sobrevenda`);
    } else if (priceBelowEma) {
      confidence = 45;
      reasons.push(`✅ Preço ABAIXO da EMA ${effectiveSettings.ema_period} (tendência de baixa)`);
      reasons.push(`❌ RSI(${effectiveSettings.rsi_period}) em ${rsi.toFixed(1)} - não está em sobrecompra`);
    } else {
      confidence = 35;
      reasons.push(`⚠️ RSI(${effectiveSettings.rsi_period}) em ${rsi.toFixed(1)} - zona neutra`);
      reasons.push(`⚠️ Preço próximo à EMA ${effectiveSettings.ema_period} - sem tendência clara`);
    }
    
    reasons.push(`⏳ AGUARDAR - condições de entrada não confirmadas`);
  }

  // Calculate entry, stop loss, and take profit using configured percentages
  const slPercent = effectiveSettings.stop_loss_percent / 100;
  const tpPercent = effectiveSettings.take_profit_percent / 100;
  
  let stopLoss: number;
  let takeProfit: number;

  if (signalType === "BUY") {
    stopLoss = currentPrice * (1 - slPercent);
    takeProfit = currentPrice * (1 + tpPercent);
  } else if (signalType === "SELL") {
    stopLoss = currentPrice * (1 + slPercent);
    takeProfit = currentPrice * (1 - tpPercent);
  } else {
    // For HOLD, use ATR-based levels
    stopLoss = currentPrice - atr * 1.5;
    takeProfit = currentPrice + atr * 1.5;
  }

  return {
    pair_id: pair.id,
    symbol: pair.symbol.replace("/", ""),
    timeframe,
    signal_type: signalType,
    confidence,
    rsi: Math.round(rsi * 100) / 100,
    ema_20: Math.round(ema * 100000) / 100000,
    current_price: Math.round(currentPrice * 100000) / 100000,
    trend,
    entry_price: Math.round(currentPrice * 100000) / 100000,
    stop_loss: Math.round(stopLoss * 100000) / 100000,
    take_profit: Math.round(takeProfit * 100000) / 100000,
    reasons,
  };
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

async function loadAISettings(supabase: any): Promise<AISettings> {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .eq("key", "ai_settings")
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error loading AI settings:", error);
      return DEFAULT_SETTINGS;
    }

    if (data?.value) {
      return { ...DEFAULT_SETTINGS, ...data.value };
    }

    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Error loading AI settings:", error);
    return DEFAULT_SETTINGS;
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load AI settings from database
    const aiSettings = await loadAISettings(supabase);
    console.log(`Loaded AI settings: RSI(${aiSettings.rsi_period}) thresholds ${aiSettings.rsi_oversold}/${aiSettings.rsi_overbought}, EMA(${aiSettings.ema_period})`);

    // Parse request body for optional timeframe
    let timeframe = aiSettings.default_timeframe;
    try {
      const body = await req.json();
      if (body.timeframe) timeframe = body.timeframe;
    } catch {
      // Use default timeframe
    }

    // Validate timeframe is enabled
    if (!aiSettings.enabled_timeframes.includes(timeframe)) {
      console.log(`Timeframe ${timeframe} not enabled, using default ${aiSettings.default_timeframe}`);
      timeframe = aiSettings.default_timeframe;
    }

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
        const analysis = generateAnalysis(pair, ohlcData, timeframe, aiSettings);

        // Only save signals that meet minimum confidence thresholds
        const meetsThreshold = 
          (analysis.signal_type === "BUY" && analysis.confidence >= aiSettings.min_confidence_buy) ||
          (analysis.signal_type === "SELL" && analysis.confidence >= aiSettings.min_confidence_sell) ||
          analysis.signal_type === "HOLD";

        // Upsert to database
        const { error: upsertError } = await supabase.from("market_analysis").upsert(
          {
            pair_id: analysis.pair_id,
            symbol: analysis.symbol,
            timeframe: analysis.timeframe,
            signal_type: analysis.signal_type,
            confidence: analysis.confidence,
            rsi: analysis.rsi,
            ema_short: analysis.ema_20,
            ema_long: analysis.ema_20,
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
          const thresholdNote = meetsThreshold ? "" : " (below threshold)";
          console.log(
            `Analysis for ${pair.symbol}: ${analysis.signal_type} (${analysis.confidence}%)${thresholdNote}`
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
        settings: {
          rsi_period: aiSettings.rsi_period,
          rsi_thresholds: [aiSettings.rsi_oversold, aiSettings.rsi_overbought],
          ema_period: aiSettings.ema_period,
          min_confidence: [aiSettings.min_confidence_buy, aiSettings.min_confidence_sell],
        },
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
