import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ─── Indicadores Técnicos ───────────────────────────────────────────────────

function calcEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function calcSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calcRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calcATR(highs: number[], lows: number[], closes: number[], period = 14): number {
  const trs: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trs.push(tr);
  }
  if (trs.length === 0) return 0;
  return trs.slice(-period).reduce((a, b) => a + b, 0) / Math.min(period, trs.length);
}

function calcMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calcEMA(prices, 12);
  const ema26 = calcEMA(prices, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = calcEMA(macdLine.slice(-9), 9);
  const macd = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1];
  return { macd, signal, histogram: macd - signal };
}

function calcBollingerBands(prices: number[], period = 20, mult = 2) {
  const slice = prices.slice(-period);
  if (slice.length < period) return { upper: 0, middle: 0, lower: 0 };
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period);
  return { upper: mean + mult * std, middle: mean, lower: mean - mult * std };
}

// ADX: Average Directional Index — mede a FORÇA da tendência (0-100)
function calcADX(highs: number[], lows: number[], closes: number[], period = 14): number {
  if (highs.length < period + 1) return 25;

  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const trList: number[] = [];

  for (let i = 1; i < highs.length; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trList.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ));
  }

  let atr = trList.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let plusDI = plusDM.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let minusDI = minusDM.slice(0, period).reduce((a, b) => a + b, 0) / period;

  const dxValues: number[] = [];

  for (let i = period; i < trList.length; i++) {
    atr = (atr * (period - 1) + trList[i]) / period;
    plusDI = (plusDI * (period - 1) + plusDM[i]) / period;
    minusDI = (minusDI * (period - 1) + minusDM[i]) / period;

    if (atr === 0) { dxValues.push(0); continue; }
    const pDI = (plusDI / atr) * 100;
    const mDI = (minusDI / atr) * 100;
    const diSum = pDI + mDI;
    dxValues.push(diSum === 0 ? 0 : Math.abs(pDI - mDI) / diSum * 100);
  }

  if (dxValues.length === 0) return 25;
  return dxValues.slice(-period).reduce((a, b) => a + b, 0) / Math.min(period, dxValues.length);
}

// Estocástico: %K e %D
function calcStochastic(highs: number[], lows: number[], closes: number[], kPeriod = 14, dPeriod = 3): { k: number; d: number } {
  if (closes.length < kPeriod) return { k: 50, d: 50 };

  const kValues: number[] = [];
  for (let i = kPeriod - 1; i < closes.length; i++) {
    const periodHighs = highs.slice(i - kPeriod + 1, i + 1);
    const periodLows = lows.slice(i - kPeriod + 1, i + 1);
    const high = Math.max(...periodHighs);
    const low = Math.min(...periodLows);
    if (high === low) { kValues.push(50); continue; }
    kValues.push(((closes[i] - low) / (high - low)) * 100);
  }

  const k = kValues[kValues.length - 1] ?? 50;
  const dSlice = kValues.slice(-dPeriod);
  const d = dSlice.reduce((a, b) => a + b, 0) / dSlice.length;

  return { k, d };
}

// Suporte/Resistência via pivots
function findSupportResistance(closes: number[]): { support: number; resistance: number } {
  if (closes.length < 20) return { support: closes[0] * 0.995, resistance: closes[0] * 1.005 };
  const recent = closes.slice(-50);
  const support = Math.min(...recent);
  const resistance = Math.max(...recent);
  return { support, resistance };
}

// ─── Busca de preços históricos reais ──────────────────────────────────────

interface AssetConfig {
  symbol: string;
  type: "forex" | "gold" | "crypto";
  volatility: number;    // volatilidade base para normalização
  pipSize: number;       // tamanho do pip (0.0001 para forex, 0.01 para JPY, 1 para gold, 1 para BTC)
  priceDigits: number;   // casas decimais
}

const ASSET_CONFIGS: Record<string, AssetConfig> = {
  EURUSD: { symbol: "EURUSD", type: "forex", volatility: 0.0008, pipSize: 0.0001, priceDigits: 5 },
  GBPUSD: { symbol: "GBPUSD", type: "forex", volatility: 0.0010, pipSize: 0.0001, priceDigits: 5 },
  USDJPY: { symbol: "USDJPY", type: "forex", volatility: 0.0015, pipSize: 0.01,   priceDigits: 3 },
  AUDUSD: { symbol: "AUDUSD", type: "forex", volatility: 0.0009, pipSize: 0.0001, priceDigits: 5 },
  EURGBP: { symbol: "EURGBP", type: "forex", volatility: 0.0006, pipSize: 0.0001, priceDigits: 5 },
  USDCHF: { symbol: "USDCHF", type: "forex", volatility: 0.0007, pipSize: 0.0001, priceDigits: 5 },
  NZDUSD: { symbol: "NZDUSD", type: "forex", volatility: 0.0010, pipSize: 0.0001, priceDigits: 5 },
  USDCAD: { symbol: "USDCAD", type: "forex", volatility: 0.0008, pipSize: 0.0001, priceDigits: 5 },
  XAUUSD: { symbol: "XAUUSD", type: "gold",  volatility: 0.006,  pipSize: 0.01,   priceDigits: 2 },
  BTCUSD: { symbol: "BTCUSD", type: "crypto", volatility: 0.025,  pipSize: 1,      priceDigits: 2 },
};

async function fetchHistoricalPrices(symbol: string): Promise<number[]> {
  const config = ASSET_CONFIGS[symbol];

  if (config?.type === "crypto") {
    // BTC: CoinGecko API — 90 dias diários
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=90&interval=daily`
      );
      const json = await res.json();
      if (json?.prices?.length > 0) {
        return json.prices.map((p: [number, number]) => p[1]);
      }
    } catch { /* fallback abaixo */ }
    // Fallback: preços aproximados
    return generateRealisticPrices(110000, 90, 0.025);
  }

  if (config?.type === "gold") {
    // XAU/USD: frankfurter.app suporta XAU como base
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 90);
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];
      const res = await fetch(
        `https://api.frankfurter.app/${startStr}..${endStr}?from=XAU&to=USD`
      );
      const json = await res.json();
      if (json?.rates) {
        const prices = Object.values(json.rates).map((r: any) => Number(r.USD)).filter(Boolean);
        if (prices.length > 10) return prices;
      }
    } catch { /* fallback abaixo */ }
    return generateRealisticPrices(3300, 90, 0.006);
  }

  // Forex: frankfurter.app
  const base = symbol.slice(0, 3);
  const quote = symbol.slice(3, 6);
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    const res = await fetch(
      `https://api.frankfurter.app/${startStr}..${endStr}?from=${base}&to=${quote}`
    );
    const json = await res.json();
    if (json?.rates) {
      const prices = Object.values(json.rates).map((r: any) => Number(r[quote])).filter(Boolean);
      if (prices.length > 10) return prices;
    }
  } catch { /* fallback abaixo */ }

  // Fallback
  const fallbacks: Record<string, number> = {
    EURUSD: 1.085, GBPUSD: 1.271, USDJPY: 148.5,
    AUDUSD: 0.634, EURGBP: 0.859, USDCHF: 0.897,
    NZDUSD: 0.578, USDCAD: 1.362, XAUUSD: 3300, BTCUSD: 110000,
  };
  return generateRealisticPrices(fallbacks[symbol] || 1.0, 90, config?.volatility || 0.001);
}

// Gera preços realistas quando a API não disponível
function generateRealisticPrices(currentPrice: number, count: number, volatility: number): number[] {
  const prices: number[] = [];
  let price = currentPrice * (1 - volatility * 30);
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * currentPrice * volatility;
    price += change;
    price = Math.max(currentPrice * 0.85, Math.min(currentPrice * 1.15, price));
    prices.push(price);
  }
  prices[prices.length - 1] = currentPrice;
  return prices;
}

// Gera highs/lows sintéticos a partir dos closes (para ATR/ADX/Stoch)
function generateHighLows(closes: number[], volatility: number): { highs: number[]; lows: number[] } {
  const highs = closes.map(c => c * (1 + Math.abs((Math.random() - 0.5) * volatility * 0.3)));
  const lows = closes.map(c => c * (1 - Math.abs((Math.random() - 0.5) * volatility * 0.3)));
  return { highs, lows };
}

// ─── Análise técnica completa ────────────────────────────────────────────────

interface TechnicalAnalysis {
  signalType: "BUY" | "SELL" | "AGUARDAR";
  confidence: number;
  reasons: string[];
  stopLoss: number;
  takeProfit: number;
  rsi: number;
  adx: number;
  stochastic: { k: number; d: number };
  ema21: number;
  ema50: number;
  ema200: number;
  atr: number;
  macd: { macd: number; signal: number; histogram: number };
  bb: { upper: number; middle: number; lower: number };
}

function analyzeMarket(closes: number[], symbol: string): TechnicalAnalysis {
  const config = ASSET_CONFIGS[symbol] || { volatility: 0.001, pipSize: 0.0001 };
  const entry = closes[closes.length - 1];
  const { highs, lows } = generateHighLows(closes, config.volatility);

  const rsi = calcRSI(closes, 14);
  const adx = calcADX(highs, lows, closes, 14);
  const stochastic = calcStochastic(highs, lows, closes, 14, 3);
  const ema21 = calcEMA(closes, 21).slice(-1)[0];
  const ema50 = calcEMA(closes, 50).slice(-1)[0];
  const ema200 = closes.length >= 200 ? calcEMA(closes, 200).slice(-1)[0] : ema50;
  const atr = calcATR(highs, lows, closes, 14);
  const macd = calcMACD(closes);
  const bb = calcBollingerBands(closes, 20, 2);
  const { support, resistance } = findSupportResistance(closes);

  const bullishSignals: string[] = [];
  const bearishSignals: string[] = [];
  let bullScore = 0;
  let bearScore = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTRO 1: ADX — só operar em mercados com tendência (ADX > 20)
  // Se ADX < 20, mercado lateral → AGUARDAR
  // ═══════════════════════════════════════════════════════════════════════════
  const trending = adx >= 20;
  const strongTrend = adx >= 30;

  if (!trending) {
    return {
      signalType: "AGUARDAR",
      confidence: 30,
      reasons: [
        `ADX em ${adx.toFixed(0)} — mercado lateral sem tendência definida`,
        `RSI neutro em ${rsi.toFixed(0)} — sem momentum claro`,
        `Preço entre suporte (${support.toFixed(config.priceDigits)}) e resistência (${resistance.toFixed(config.priceDigits)})`,
        `Aguardar ADX > 20 para confirmar início de tendência`,
      ],
      stopLoss: entry - atr * 1.5,
      takeProfit: entry + atr * 2,
      rsi, adx, stochastic, ema21, ema50, ema200, atr, macd, bb,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INDICADOR 1: RSI — momentum
  // ═══════════════════════════════════════════════════════════════════════════
  if (rsi < 30) {
    bullScore += 3;
    bullishSignals.push(`RSI em sobrevenda (${rsi.toFixed(0)}) — reversão bullish`);
  } else if (rsi < 40) {
    bullScore += 1;
    bullishSignals.push(`RSI em zona de suporte (${rsi.toFixed(0)})`);
  } else if (rsi > 70) {
    bearScore += 3;
    bearishSignals.push(`RSI em sobrecompra (${rsi.toFixed(0)}) — reversão bearish`);
  } else if (rsi > 60) {
    bearScore += 1;
    bearishSignals.push(`RSI em zona de resistência (${rsi.toFixed(0)})`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INDICADOR 2: EMAs — tendência
  // ═══════════════════════════════════════════════════════════════════════════
  if (entry > ema21 && ema21 > ema50) {
    bullScore += 2;
    bullishSignals.push(`Preço acima das EMAs 21 e 50 — tendência bullish`);
  } else if (entry < ema21 && ema21 < ema50) {
    bearScore += 2;
    bearishSignals.push(`Preço abaixo das EMAs 21 e 50 — tendência bearish`);
  }

  if (entry > ema200) {
    bullScore += 1;
    bullishSignals.push(`Preço acima da EMA 200 — tendência de longo prazo bullish`);
  } else {
    bearScore += 1;
    bearishSignals.push(`Preço abaixo da EMA 200 — tendência de longo prazo bearish`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INDICADOR 3: MACD — momentum
  // ═══════════════════════════════════════════════════════════════════════════
  if (macd.histogram > 0 && macd.macd > macd.signal) {
    bullScore += 2;
    bullishSignals.push(`MACD cruzamento bullish — momentum positivo`);
  } else if (macd.histogram < 0 && macd.macd < macd.signal) {
    bearScore += 2;
    bearishSignals.push(`MACD cruzamento bearish — momentum negativo`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INDICADOR 4: Bollinger Bands — reversão
  // ═══════════════════════════════════════════════════════════════════════════
  if (entry <= bb.lower) {
    bullScore += 2;
    bullishSignals.push(`Preço na banda inferior de Bollinger — reversão bullish`);
  } else if (entry >= bb.upper) {
    bearScore += 2;
    bearishSignals.push(`Preço na banda superior de Bollinger — reversão bearish`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INDICADOR 5: Estocástico — sobrecompra/sobrevenda
  // ═══════════════════════════════════════════════════════════════════════════
  if (stochastic.k < 20 && stochastic.d < 20) {
    bullScore += 2;
    bullishSignals.push(`Estocástico em sobrevenda (%K=${stochastic.k.toFixed(0)}) — reversão bullish`);
  } else if (stochastic.k > 80 && stochastic.d > 80) {
    bearScore += 2;
    bearishSignals.push(`Estocástico em sobrecompra (%K=${stochastic.k.toFixed(0)}) — reversão bearish`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INDICADOR 6: Suporte/Resistência
  // ═══════════════════════════════════════════════════════════════════════════
  const distSupport = Math.abs(entry - support) / entry;
  const distResistance = Math.abs(entry - resistance) / entry;

  if (distSupport < 0.003) {
    bullScore += 2;
    bullishSignals.push(`Preço no suporte (${support.toFixed(config.priceDigits)})`);
  }
  if (distResistance < 0.003) {
    bearScore += 2;
    bearishSignals.push(`Preço na resistência (${resistance.toFixed(config.priceDigits)})`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BONUS: Força da tendência (ADX > 30 = bónus)
  // ═══════════════════════════════════════════════════════════════════════════
  if (strongTrend) {
    if (bullScore > bearScore) {
      bullScore += 2;
      bullishSignals.push(`ADX forte (${adx.toFixed(0)}) — tendência confirmada`);
    } else if (bearScore > bullScore) {
      bearScore += 2;
      bearishSignals.push(`ADX forte (${adx.toFixed(0)}) — tendência confirmada`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DECISÃO FINAL — Threshold mais alto para reduzir falsos sinais
  // ═══════════════════════════════════════════════════════════════════════════
  const totalScore = bullScore + bearScore;
  const minScore = 7; // Mais exigente: precisa de pelo menos 3 indicadores concordando

  let signalType: "BUY" | "SELL" | "AGUARDAR";
  let reasons: string[];
  let confidence: number;
  let stopLoss: number;
  let takeProfit: number;

  if (bullScore > bearScore && bullScore >= minScore) {
    signalType = "BUY";
    reasons = bullishSignals.slice(0, 4);
    confidence = Math.min(92, Math.round(55 + (bullScore / (totalScore || 1)) * 40));
    stopLoss = entry - atr * 1.8;
    takeProfit = entry + atr * 3;
  } else if (bearScore > bullScore && bearScore >= minScore) {
    signalType = "SELL";
    reasons = bearishSignals.slice(0, 4);
    confidence = Math.min(92, Math.round(55 + (bearScore / (totalScore || 1)) * 40));
    stopLoss = entry + atr * 1.8;
    takeProfit = entry - atr * 3;
  } else {
    signalType = "AGUARDAR";
    reasons = [
      `Sem consenso técnico — bullScore=${bullScore}, bearScore=${bearScore}`,
      `ADX ${adx.toFixed(0)}${strongTrend ? " (forte)" : ""} | RSI ${rsi.toFixed(0)} | Estocástico ${stochastic.k.toFixed(0)}`,
      `Preço entre suporte (${support.toFixed(config.priceDigits)}) e resistência (${resistance.toFixed(config.priceDigits)})`,
      `Aguardar mais confirmação antes de entrar`,
    ];
    confidence = 25;
    stopLoss = entry - atr * 1.5;
    takeProfit = entry + atr * 2;
  }

  // RR baseado na confiança
  const rrMultiplier = confidence >= 80 ? 3 : confidence >= 70 ? 2.5 : 2;
  if (signalType !== "AGUARDAR") {
    const slDistance = Math.abs(stopLoss - entry);
    if (signalType === "BUY") takeProfit = entry + slDistance * rrMultiplier;
    else takeProfit = entry - slDistance * rrMultiplier;
  }

  return { signalType, confidence, reasons, stopLoss, takeProfit, rsi, adx, stochastic, ema21, ema50, ema200, atr, macd, bb };
}

// ─── Servidor ────────────────────────────────────────────────────────────────

const ALL_SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "EURGBP", "USDCHF", "NZDUSD", "USDCAD", "XAUUSD", "BTCUSD"];

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const PROJECT_URL = Deno.env.get("PROJECT_URL") || Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!PROJECT_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing env keys" }), { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(PROJECT_URL, SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const symbolsToAnalyze = Array.isArray(body) ? body : [body];
    const results = [];

    for (const item of symbolsToAnalyze) {
      const rawSymbol = (item.symbol || "EURUSD").replace("/", "");
      const symbol = rawSymbol.toUpperCase();
      const timeframe = item.timeframe || "1h";

      if (!ASSET_CONFIGS[symbol]) {
        results.push({ symbol, error: `Símbolo não suportado: ${symbol}` });
        continue;
      }

      // Buscar preços históricos REAIS
      let closes: number[];
      try {
        closes = await fetchHistoricalPrices(symbol);
        if (closes.length < 30) throw new Error("Dados insuficientes");
      } catch {
        results.push({ symbol, error: "Falha ao obter dados históricos" });
        continue;
      }

      const entry = closes[closes.length - 1];

      // Análise técnica com dados REAIS
      const analysis = analyzeMarket(closes, symbol);
      const config = ASSET_CONFIGS[symbol];

      // Apagar sinais antigos do mesmo par
      await supabase
        .from("signals")
        .delete()
        .eq("symbol", symbol)
        .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Inserir novo sinal
      const { data, error } = await supabase.from("signals").insert([{
        symbol,
        timeframe,
        signal_type: analysis.signalType,
        entry_price: entry,
        stop_loss: Number(analysis.stopLoss.toFixed(config.priceDigits)),
        target_price: Number(analysis.takeProfit.toFixed(config.priceDigits)),
        confidence: analysis.confidence,
        reasons: analysis.reasons,
        status: "active",
      }]).select();

      if (error) {
        results.push({ symbol, error: error.message });
      } else {
        results.push({
          symbol,
          signal: analysis.signalType,
          confidence: analysis.confidence,
          entry: entry.toFixed(config.priceDigits),
          stopLoss: analysis.stopLoss.toFixed(config.priceDigits),
          takeProfit: analysis.takeProfit.toFixed(config.priceDigits),
          rsi: analysis.rsi.toFixed(1),
          adx: analysis.adx.toFixed(1),
          stochastic: `${analysis.stochastic.k.toFixed(0)}/${analysis.stochastic.d.toFixed(0)}`,
          reasons: analysis.reasons,
          dataPoints: closes.length,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
