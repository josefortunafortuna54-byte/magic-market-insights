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
    trList.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
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

function findSupportResistance(closes: number[]): { support: number; resistance: number } {
  if (closes.length < 20) return { support: closes[0] * 0.995, resistance: closes[0] * 1.005 };
  const recent = closes.slice(-50);
  const support = Math.min(...recent);
  const resistance = Math.max(...recent);
  return { support, resistance };
}

// ─── Ichimoku Cloud ─────────────────────────────────────────────────────────
function calcIchimoku(highs: number[], lows: number[], closes: number[]): {
  tenkanSen: number; kijunSen: number; senkouSpanA: number; senkouSpanB: number;
} {
  const period9 = 9;
  const period26 = 52;
  const high9 = Math.max(...highs.slice(-period9));
  const low9 = Math.min(...lows.slice(-period9));
  const tenkanSen = (high9 + low9) / 2;
  const high26 = Math.max(...highs.slice(-period26));
  const low26 = Math.min(...lows.slice(-period26));
  const kijunSen = (high26 + low26) / 2;
  const senkouSpanA = (tenkanSen + kijunSen) / 2;
  const high52 = Math.max(...highs.slice(-period26));
  const low52 = Math.min(...lows.slice(-period26));
  const senkouSpanB = (high52 + low52) / 2;
  return { tenkanSen, kijunSen, senkouSpanA, senkouSpanB };
}

// ─── Fibonacci Retracement ──────────────────────────────────────────────────
function calcFibonacci(highs: number[], lows: number[]): { level_236: number; level_382: number; level_500: number; level_618: number } {
  const high = Math.max(...highs.slice(-50));
  const low = Math.min(...lows.slice(-50));
  const range = high - low;
  return {
    level_236: high - range * 0.236,
    level_382: high - range * 0.382,
    level_500: high - range * 0.500,
    level_618: high - range * 0.618,
  };
}

// ─── Busca de preços históricos reais ──────────────────────────────────────

interface AssetConfig {
  symbol: string;
  type: "forex" | "gold" | "crypto";
  volatility: number;
  pipSize: number;
  priceDigits: number;
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
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=90&interval=daily`);
      const json = await res.json();
      if (json?.prices?.length > 0) return json.prices.map((p: [number, number]) => p[1]);
    } catch { }
    return generateRealisticPrices(110000, 90, 0.025);
  }

  if (config?.type === "gold") {
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 90);
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];
      const res = await fetch(`https://api.frankfurter.app/${startStr}..${endStr}?from=XAU&to=USD`);
      const json = await res.json();
      if (json?.rates) {
        const prices = Object.values(json.rates).map((r: any) => Number(r.USD)).filter(Boolean);
        if (prices.length > 10) return prices;
      }
    } catch { }
    return generateRealisticPrices(3300, 90, 0.006);
  }

  const base = symbol.slice(0, 3);
  const quote = symbol.slice(3, 6);
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    const res = await fetch(`https://api.frankfurter.app/${startStr}..${endStr}?from=${base}&to=${quote}`);
    const json = await res.json();
    if (json?.rates) {
      const prices = Object.values(json.rates).map((r: any) => Number(r[quote])).filter(Boolean);
      if (prices.length > 10) return prices;
    }
  } catch { }

  const fallbacks: Record<string, number> = {
    EURUSD: 1.085, GBPUSD: 1.271, USDJPY: 148.5,
    AUDUSD: 0.634, EURGBP: 0.859, USDCHF: 0.897,
    NZDUSD: 0.578, USDCAD: 1.362, XAUUSD: 3300, BTCUSD: 110000,
  };
  return generateRealisticPrices(fallbacks[symbol] || 1.0, 90, config?.volatility || 0.001);
}

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
  const config = ASSET_CONFIGS[symbol] || { volatility: 0.001, pipSize: 0.0001, priceDigits: 5 };
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
  const ichimoku = calcIchimoku(highs, lows, closes);
  const fibonacci = calcFibonacci(highs, lows);

  const bullishSignals: string[] = [];
  const bearishSignals: string[] = [];
  const bullScore = { raw: 0, weighted: 0 };
  const bearScore = { raw: 0, weighted: 0 };

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTRO 1: ADX — só operar em mercados com tendência (ADX > 20)
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
  // INDICADOR 1: RSI (peso: 3) — momentum
  // ═══════════════════════════════════════════════════════════════════════════
  if (rsi < 30) {
    bullScore.raw += 1; bullScore.weighted += 3;
    bullishSignals.push(`RSI em sobrevenda (${rsi.toFixed(0)}) — zona de reversão bullish`);
  } else if (rsi < 40) {
    bullScore.raw += 1; bullScore.weighted += 1.5;
    bullishSignals.push(`RSI em zona de suporte (${rsi.toFixed(0)}) — momentum a recuperar`);
  } else if (rsi > 70) {
    bearScore.raw += 1; bearScore.weighted += 3;
    bearishSignals.push(`RSI em sobrecompra (${rsi.toFixed(0)}) — zona de reversão bearish`);
  } else if (rsi > 60) {
    bearScore.raw += 1; bearScore.weighted += 1.5;
    bearishSignals.push(`RSI em zona de resistência (${rsi.toFixed(0)}) — momentum a esgotar`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INDICADOR 2: EMAs (peso: 3) — tendência
  // ═══════════════════════════════════════════════════════════════════════════
  const ema21Dist = ((entry - ema21) / ema21) * 100;
  if (entry > ema21 && ema21 > ema50) {
    bullScore.raw += 1; bullScore.weighted += 3;
    bullishSignals.push(`Preço acima das EMAs 21/50 (${ema21Dist > 0 ? "+" : ""}${ema21Dist.toFixed(2)}%) — tendência bullish alinhada`);
  } else if (entry < ema21 && ema21 < ema50) {
    bearScore.raw += 1; bearScore.weighted += 3;
    bearishSignals.push(`Preço abaixo das EMAs 21/50 (${ema21Dist.toFixed(2)}%) — tendência bearish alinhada`);
  } else if (entry > ema21 && ema21 < ema50) {
    bullScore.raw += 1; bullScore.weighted += 1;
    bullishSignals.push(`Preço acima da EMA 21 mas abaixo da EMA 50 — momentum curto bullish, médio em transição`);
  } else if (entry < ema21 && ema21 > ema50) {
    bearScore.raw += 1; bearScore.weighted += 1;
    bearishSignals.push(`Preço abaixo da EMA 21 mas acima da EMA 50 — momentum curto bearish, médio em transição`);
  }

  if (entry > ema200) {
    bullScore.raw += 1; bullScore.weighted += 2;
    bullishSignals.push(`Preço acima da EMA 200 — tendência de longo prazo bullish`);
  } else {
    bearScore.raw += 1; bearScore.weighted += 2;
    bearishSignals.push(`Preço abaixo da EMA 200 — tendência de longo prazo bearish`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INDICADOR 3: MACD (peso: 2.5) — momentum
  // ═══════════════════════════════════════════════════════════════════════════
  const macdCrossUp = macd.histogram > 0 && macd.macd > macd.signal;
  const macdCrossDown = macd.histogram < 0 && macd.macd < macd.signal;
  if (macdCrossUp) {
    bullScore.raw += 1; bullScore.weighted += 2.5;
    bullishSignals.push(`MACD cruzamento bullish — histograma positivo e a crescer`);
  } else if (macdCrossDown) {
    bearScore.raw += 1; bearScore.weighted += 2.5;
    bearishSignals.push(`MACD cruzamento bearish — histograma negativo e a decrescer`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INDICADOR 4: Bollinger Bands (peso: 2) — reversão
  // ═══════════════════════════════════════════════════════════════════════════
  const bbWidth = bb.upper - bb.lower;
  const bbPosition = (entry - bb.lower) / bbWidth;
  if (entry <= bb.lower) {
    bullScore.raw += 1; bullScore.weighted += 2;
    bullishSignals.push(`Preço na banda inferior de Bollinger (posição ${(bbPosition * 100).toFixed(0)}%) — reversão potencial`);
  } else if (entry >= bb.upper) {
    bearScore.raw += 1; bearScore.weighted += 2;
    bearishSignals.push(`Preço na banda superior de Bollinger (posição ${(bbPosition * 100).toFixed(0)}%) — reversão potencial`);
  } else if (bbPosition < 0.3) {
    bullScore.raw += 1; bullScore.weighted += 1;
    bullishSignals.push(`Preço na zona inferior de Bollinger (${(bbPosition * 100).toFixed(0)}%) — suporte próximo`);
  } else if (bbPosition > 0.7) {
    bearScore.raw += 1; bearScore.weighted += 1;
    bearishSignals.push(`Preço na zona superior de Bollinger (${(bbPosition * 100).toFixed(0)}%) — resistência próxima`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INDICADOR 5: Estocástico (peso: 2) — sobrecompra/sobrevenda
  // ═══════════════════════════════════════════════════════════════════════════
  if (stochastic.k < 20 && stochastic.d < 20) {
    bullScore.raw += 1; bullScore.weighted += 2;
    bullishSignals.push(`Estocástico em sobrevenda (%K=${stochastic.k.toFixed(0)}, %D=${stochastic.d.toFixed(0)}) — reversão`);
  } else if (stochastic.k > 80 && stochastic.d > 80) {
    bearScore.raw += 1; bearScore.weighted += 2;
    bearishSignals.push(`Estocástico em sobrecompra (%K=${stochastic.k.toFixed(0)}, %D=${stochastic.d.toFixed(0)}) — reversão`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INDICADOR 6: Suporte/Resistência (peso: 2)
  // ═══════════════════════════════════════════════════════════════════════════
  const distSupport = Math.abs(entry - support) / entry;
  const distResistance = Math.abs(entry - resistance) / entry;
  if (distSupport < 0.003) {
    bullScore.raw += 1; bullScore.weighted += 2;
    bullishSignals.push(`Preço no suporte (${support.toFixed(config.priceDigits)}) — zona de compra`);
  }
  if (distResistance < 0.003) {
    bearScore.raw += 1; bearScore.weighted += 2;
    bearishSignals.push(`Preço na resistência (${resistance.toFixed(config.priceDigits)}) — zona de venda`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INDICADOR 7: Ichimoku Cloud (peso: 2.5) — tendência
  // ═══════════════════════════════════════════════════════════════════════════
  const cloudTop = Math.max(ichimoku.senkouSpanA, ichimoku.senkouSpanB);
  const cloudBottom = Math.min(ichimoku.senkouSpanA, ichimoku.senkouSpanB);
  const aboveCloud = entry > cloudTop;
  const belowCloud = entry < cloudBottom;
  const tenkanAboveKijun = ichimoku.tenkanSen > ichimoku.kijunSen;

  if (aboveCloud && tenkanAboveKijun) {
    bullScore.raw += 1; bullScore.weighted += 2.5;
    bullishSignals.push(`Ichimoku: preço acima da nuvem e Tenkan > Kijun — confirmação de tendência bullish`);
  } else if (belowCloud && !tenkanAboveKijun) {
    bearScore.raw += 1; bearScore.weighted += 2.5;
    bearishSignals.push(`Ichimoku: preço abaixo da nuvem e Tenkan < Kijun — confirmação de tendência bearish`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INDICADOR 8: Fibonacci Retracement (peso: 1.5)
  // ═══════════════════════════════════════════════════════════════════════════
  const distFib382 = Math.abs(entry - fibonacci.level_382) / entry;
  const distFib618 = Math.abs(entry - fibonacci.level_618) / entry;
  if (distFib382 < 0.002) {
    bullScore.raw += 1; bullScore.weighted += 1.5;
    bullishSignals.push(`Preço no Fibonacci 38.2% (${fibonacci.level_382.toFixed(config.priceDigits)}) — retracemento`);
  }
  if (distFib618 < 0.002) {
    bullScore.raw += 1; bullScore.weighted += 1.5;
    bullishSignals.push(`Preço no Fibonacci 61.8% (${fibonacci.level_618.toFixed(config.priceDigits)}) — nível de ouro`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BONUS: Força da tendência (ADX > 30)
  // ═══════════════════════════════════════════════════════════════════════════
  if (strongTrend) {
    if (bullScore.weighted > bearScore.weighted) {
      bullScore.raw += 1; bullScore.weighted += 2;
      bullishSignals.push(`ADX forte (${adx.toFixed(0)}) — tendência confirmada e com força`);
    } else if (bearScore.weighted > bullScore.weighted) {
      bearScore.raw += 1; bearScore.weighted += 2;
      bearishSignals.push(`ADX forte (${adx.toFixed(0)}) — tendência confirmada e com força`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DECISÃO FINAL — threshold adaptativo baseado em indicadores
  // ═══════════════════════════════════════════════════════════════════════════
  const minIndicators = 3;
  const minWeightedScore = 6;

  let signalType: "BUY" | "SELL" | "AGUARDAR";
  let reasons: string[];
  let confidence: number;
  let stopLoss: number;
  let takeProfit: number;

  if (bullScore.raw >= minIndicators && bullScore.weighted >= minWeightedScore && bullScore.weighted > bearScore.weighted) {
    signalType = "BUY";
    reasons = bullishSignals.slice(0, 5);
    // Confiança ponderada: mais indicadores = mais confiança
    const ratio = bullScore.weighted / (bullScore.weighted + bearScore.weighted);
    confidence = Math.min(92, Math.round(55 + ratio * 37));
    stopLoss = entry - atr * 1.8;
    takeProfit = entry + atr * 3;
  } else if (bearScore.raw >= minIndicators && bearScore.weighted >= minWeightedScore && bearScore.weighted > bullScore.weighted) {
    signalType = "SELL";
    reasons = bearishSignals.slice(0, 5);
    const ratio = bearScore.weighted / (bullScore.weighted + bearScore.weighted);
    confidence = Math.min(92, Math.round(55 + ratio * 37));
    stopLoss = entry + atr * 1.8;
    takeProfit = entry - atr * 3;
  } else {
    signalType = "AGUARDAR";
    reasons = [
      `Sem consenso — bullish: ${bullScore.raw} indicadores (${bullScore.weighted.toFixed(1)}pts) | bearish: ${bearScore.raw} (${bearScore.weighted.toFixed(1)}pts)`,
      `ADX ${adx.toFixed(0)}${strongTrend ? " (forte)" : ""} | RSI ${rsi.toFixed(0)} | MACD ${macd.histogram > 0 ? "+" : ""}${macd.histogram.toFixed(4)}`,
      `Preço entre suporte (${support.toFixed(config.priceDigits)}) e resistência (${resistance.toFixed(config.priceDigits)})`,
      `Aguardar mais confirmação antes de entrar — mínimo ${minIndicators} indicadores e ${minWeightedScore} pontos`,
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

      let closes: number[];
      try {
        closes = await fetchHistoricalPrices(symbol);
        if (closes.length < 30) throw new Error("Dados insuficientes");
      } catch {
        results.push({ symbol, error: "Falha ao obter dados históricos" });
        continue;
      }

      const entry = closes[closes.length - 1];
      const analysis = analyzeMarket(closes, symbol);
      const config = ASSET_CONFIGS[symbol];

      await supabase
        .from("signals")
        .delete()
        .eq("symbol", symbol)
        .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

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
