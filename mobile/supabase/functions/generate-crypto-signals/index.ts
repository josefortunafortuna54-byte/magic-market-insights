// generate-crypto-signals — Gera sinais de trading via IA (Gemini).
// Dias de semana: sinais forex (EURUSD, GBPUSD, USDJPY, XAUUSD, etc).
// Fim de semana: sinais crypto (BTCUSDT, ETHUSDT).
// Dados: Binance (crypto), Twelve Data + frankfurter (forex).
// Geração automática via pg_cron nos 17 horários WAT.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
const MODEL_FALLBACKS = ['gemini-2.5-flash', 'gemini-3.6-flash'];
const apiBase = 'https://generativelanguage.googleapis.com/v1beta';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Pares ───────────────────────────────────────────────────────────────────

const CRYPTO_PAIRS = ['BTCUSDT', 'ETHUSDT'] as const;
const FOREX_PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'EURGBP', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'] as const;

const FOREX_PAIR_CONFIG: Record<string, { base: string; quote: string }> = {
  EURUSD: { base: 'EUR', quote: 'USD' },
  GBPUSD: { base: 'GBP', quote: 'USD' },
  USDJPY: { base: 'USD', quote: 'JPY' },
  XAUUSD: { base: 'XAU', quote: 'USD' },
  EURGBP: { base: 'EUR', quote: 'GBP' },
  USDCHF: { base: 'USD', quote: 'CHF' },
  AUDUSD: { base: 'AUD', quote: 'USD' },
  USDCAD: { base: 'USD', quote: 'CAD' },
  NZDUSD: { base: 'NZD', quote: 'USD' },
};

function isWeekendUtc(now = new Date()): boolean {
  const day = now.getUTCDay();
  return day === 0 || day === 6;
}

function getActivePairs(): readonly string[] {
  return isWeekendUtc() ? CRYPTO_PAIRS : FOREX_PAIRS;
}

// ── Session detection (WAT = UTC+1) ─────────────────────────────────────────

interface SessionInfo {
  name: string;
  description: string;
  pairs: string[];
  volatilityHint: string;
}

function detectSession(now: Date): SessionInfo {
  const watHour = (now.getUTCHours() + 1) % 24;
  const watMin = now.getUTCMinutes();
  const time = watHour * 60 + watMin;

  if (time < 60)       return { name: 'Asia Night',   description: 'Mercado asiático noturno. Liquidez reduzida.', pairs: ['USDJPY', 'AUDUSD', 'NZDUSD'], volatilityHint: 'Baixa-Moderada' };
  if (time < 180)      return { name: 'Tokyo',         description: 'Sessão de Tóquio. Foco em pares JPY.', pairs: ['USDJPY', 'AUDUSD', 'NZDUSD'], volatilityHint: 'Moderada' };
  if (time < 300)      return { name: 'Asia',          description: 'Sessão asiática. Movimentos suaves.', pairs: ['USDJPY', 'AUDUSD', 'NZDUSD'], volatilityHint: 'Baixa' };
  if (time < 390)      return { name: 'Sydney',        description: 'Abertura de Sydney. Pares Oceania.', pairs: ['AUDUSD', 'NZDUSD', 'EURUSD'], volatilityHint: 'Baixa-Moderada' };
  if (time < 480)      return { name: 'Asia/Europa',   description: 'Transição Ásia-Europa. Preparação para Frankfurt.', pairs: ['EURUSD', 'GBPUSD', 'USDJPY'], volatilityHint: 'Moderada' };
  if (time < 570)      return { name: 'Frankfurt',     description: 'Abertura de Frankfurt. Euro starts moving.', pairs: ['EURUSD', 'EURGBP', 'USDCHF'], volatilityHint: 'Moderada-Alta' };
  if (time < 660)      return { name: 'Pre-Londres',   description: 'Pré-abertura de Londres. Acumulação.', pairs: ['EURUSD', 'GBPUSD', 'EURGBP'], volatilityHint: 'Moderada' };
  if (time < 750)      return { name: 'Londres',       description: 'Sessão de Londres. Maior liquidez forex.', pairs: ['EURUSD', 'GBPUSD', 'XAUUSD', 'EURGBP'], volatilityHint: 'Alta' };
  if (time < 810)      return { name: 'Londres MD',    description: 'Londres ao meio-dia. Consolidação.', pairs: ['EURUSD', 'GBPUSD', 'USDCHF'], volatilityHint: 'Moderada-Alta' };
  if (time < 870)      return { name: 'Overlap',       description: 'Overlap Londres/NY. Máxima volatilidade.', pairs: ['EURUSD', 'GBPUSD', 'USDCAD', 'XAUUSD'], volatilityHint: 'Muito Alta' };
  if (time < 960)      return { name: 'Nova York',     description: 'Sessão de Nova York. Alta liquidez.', pairs: ['EURUSD', 'GBPUSD', 'USDCAD', 'XAUUSD'], volatilityHint: 'Alta' };
  if (time < 1020)     return { name: 'NY Tarde',      description: 'NY afternoon. Tendências se definem.', pairs: ['EURUSD', 'GBPUSD', 'USDCAD'], volatilityHint: 'Moderada-Alta' };
  if (time < 1050)     return { name: 'NY Tarde+',     description: 'NY late session. Ajustes finais.', pairs: ['EURUSD', 'GBPUSD', 'USDCAD'], volatilityHint: 'Moderada' };
  if (time < 1115)     return { name: 'NY Fechamento', description: 'Fechamento de NY. Movimentos finais.', pairs: ['EURUSD', 'GBPUSD', 'XAUUSD'], volatilityHint: 'Moderada' };
  if (time < 1200)     return { name: 'Pós-NY',        description: 'Pós-fechamento NY. Mercado em transição.', pairs: ['EURUSD', 'GBPUSD', 'USDJPY'], volatilityHint: 'Baixa-Moderada' };
  if (time < 1295)     return { name: 'Noite',         description: 'Sessão noturna. Preparação para Ásia.', pairs: ['USDJPY', 'AUDUSD', 'NZDUSD'], volatilityHint: 'Baixa' };
  return                      { name: 'Asia Night',   description: 'Fim de ciclo. Mercado asiático.', pairs: ['USDJPY', 'AUDUSD', 'NZDUSD'], volatilityHint: 'Baixa' };
}

// ── CORS / helpers ──────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function errorJson(message: string, status = 400): Response {
  return json({ error: message }, status);
}

function nextExpiry(now: Date, timeframe: string): string {
  const d = new Date(now);
  const tf = timeframe.toUpperCase();
  if (isWeekendUtc(now)) {
    d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7));
    d.setUTCHours(5, 0, 0, 0);
    return d.toISOString();
  }
  switch (tf) {
    case 'M15': d.setUTCHours(d.getUTCHours() + 4); break;
    case 'M30': d.setUTCHours(d.getUTCHours() + 6); break;
    case 'H1': d.setUTCHours(d.getUTCHours() + 12); break;
    case 'H4': d.setUTCDate(d.getUTCDate() + 1); break;
    case 'D1': d.setUTCDate(d.getUTCDate() + 3); break;
    default: d.setUTCHours(d.getUTCHours() + 12);
  }
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

// ── Candle ──────────────────────────────────────────────────────────────────

interface Candle { o: number; h: number; l: number; c: number; v: number }

// ── Crypto: Binance ─────────────────────────────────────────────────────────

async function fetchBinanceKlines(symbol: string): Promise<Candle[]> {
  const res = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=48`,
  );
  if (!res.ok) throw new Error(`Binance ${res.status}`);
  const raw: Array<Array<number | string>> = await res.json();
  return raw.map((k) => ({
    o: Number(k[1]), h: Number(k[2]), l: Number(k[3]), c: Number(k[4]), v: Number(k[5]),
  }));
}

// ── Twelve Data: forex + gold OHLC (intraday) ──────────────────────────────

const TWELVE_DATA_KEY = Deno.env.get('TWELVE_DATA_KEY') ?? '';

const TWELVE_DATA_SYMBOLS: Record<string, string> = {
  EURUSD: 'EUR/USD', GBPUSD: 'GBP/USD', USDJPY: 'USD/JPY',
  XAUUSD: 'XAU/USD', EURGBP: 'EUR/GBP', USDCHF: 'USD/CHF',
  AUDUSD: 'AUD/USD', USDCAD: 'USD/CAD', NZDUSD: 'NZD/USD',
};

async function fetchTwelveDataOHLC(symbol: string, interval = '1h', outputsize = 48): Promise<Candle[]> {
  const tdSymbol = TWELVE_DATA_SYMBOLS[symbol];
  if (!tdSymbol || !TWELVE_DATA_KEY) throw new Error(`Twelve Data: ${symbol} not mapped or no key`);
  const res = await fetch(
    `https://api.twelvedata.com/time_series?symbol=${tdSymbol}&interval=${interval}&outputsize=${outputsize}&apikey=${TWELVE_DATA_KEY}`,
  );
  if (!res.ok) throw new Error(`Twelve Data ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.status === 'error') throw new Error(`Twelve Data: ${data.message}`);
  const values: Array<{ datetime: string; open: string; high: string; low: string; close: string; volume: string }> = data?.values ?? [];
  if (!values.length) throw new Error(`Twelve Data: no data for ${symbol}`);
  return values.reverse().map((v) => ({
    o: Number(v.open), h: Number(v.high), l: Number(v.low), c: Number(v.close), v: Number(v.volume),
  }));
}

// ── Forex: frankfurter (daily OHLC, grátis, sem key) ─────────────────────────

async function fetchFrankfurterForex(base: string, quote: string): Promise<Candle[]> {
  if (base === 'XAU') throw new Error('Frankfurter does not support XAU. Use Twelve Data.');
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const s = start.toISOString().split('T')[0];
  const e = end.toISOString().split('T')[0];

  const res = await fetch(`https://api.frankfurter.app/${s}..${e}?from=${base}&to=${quote}`);
  if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
  const data = await res.json();
  const rates = data?.rates;
  if (!rates || typeof rates !== 'object') throw new Error('Frankfurter: sem dados');
  const dates = Object.keys(rates).sort();
  const closes = dates.map((d) => Number(rates[d]?.[quote]));
  if (closes.length < 2) throw new Error('Frankfurter: dados insuficientes');
  return closes.map((c, i) => {
    const prev = i > 0 ? closes[i - 1] : c;
    const next = i < closes.length - 1 ? closes[i + 1] : c;
    return { o: prev, h: Math.max(prev, c, next), l: Math.min(prev, c, next), c, v: 0 };
  });
}

// ── Fetch candles ───────────────────────────────────────────────────────────

async function fetchCandles(symbol: string): Promise<Candle[]> {
  const norm = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (norm === 'BTCUSDT' || norm === 'BTCUSD') return fetchBinanceKlines('BTCUSDT');
  if (norm === 'ETHUSDT' || norm === 'ETHUSD') return fetchBinanceKlines('ETHUSDT');
  // Forex: try Twelve Data first (intraday), fallback to Frankfurter (daily)
  if (TWELVE_DATA_KEY && TWELVE_DATA_SYMBOLS[norm]) {
    try { return await fetchTwelveDataOHLC(norm, '1h', 48); }
    catch (e) { console.warn(`Twelve Data failed for ${norm}, fallback Frankfurter: ${e}`); }
  }
  const config = FOREX_PAIR_CONFIG[norm];
  if (config) return fetchFrankfurterForex(config.base, config.quote);
  throw new Error(`Par desconhecido: ${symbol}`);
}

// ── Technical analysis ──────────────────────────────────────────────────────

function sma(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function ema(values: number[], period: number): number {
  if (values.length < period) return sma(values);
  const k = 2 / (period + 1);
  let emaVal = sma(values.slice(0, period));
  for (let i = period; i < values.length; i++) {
    emaVal = values[i] * k + emaVal * (1 - k);
  }
  return emaVal;
}

function rsi14(closes: number[]): number {
  if (closes.length < 15) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - 14; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  return 100 - 100 / (1 + gains / losses);
}

function bollingerBands(closes: number[], period = 20): { upper: number; middle: number; lower: number; width: number } {
  const slice = closes.slice(-period);
  const mid = sma(slice);
  const variance = slice.reduce((sum, v) => sum + (v - mid) ** 2, 0) / slice.length;
  const std = Math.sqrt(variance);
  const upper = mid + 2 * std;
  const lower = mid - 2 * std;
  const width = mid > 0 ? ((upper - lower) / mid) * 100 : 0;
  return { upper, middle: mid, lower, width };
}

function macd(closes: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12 - ema26;
  // Simplified signal line (9-period EMA of MACD values)
  const macdValues: number[] = [];
  for (let i = 26; i <= closes.length; i++) {
    const e12 = ema(closes.slice(0, i), 12);
    const e26 = ema(closes.slice(0, i), 26);
    macdValues.push(e12 - e26);
  }
  const signalLine = macdValues.length >= 9 ? ema(macdValues, 9) : macdLine;
  return { macd: macdLine, signal: signalLine, histogram: macdLine - signalLine };
}

function atr(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = candles.length - period; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(c.h - c.l, Math.abs(c.h - prev.c), Math.abs(c.l - prev.c));
    trs.push(tr);
  }
  return sma(trs);
}

// ── SMC: Smart Money Concepts ──────────────────────────────────────────────

interface SwingPoint { index: number; price: number; type: 'high' | 'low' }

function findSwingPoints(candles: Candle[], lookback = 3): SwingPoint[] {
  const swings: SwingPoint[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const left = candles.slice(i - lookback, i);
    const right = candles.slice(i + 1, i + 1 + lookback);
    const current = candles[i];
    const isHigh = left.every((c) => c.h <= current.h) && right.every((c) => c.h <= current.h);
    if (isHigh) swings.push({ index: i, price: current.h, type: 'high' });
    const isLow = left.every((c) => c.l >= current.l) && right.every((c) => c.l >= current.l);
    if (isLow) swings.push({ index: i, price: current.l, type: 'low' });
  }
  return swings;
}

function detectBOS(candles: Candle[], swings: SwingPoint[]): string | null {
  if (swings.length < 4) return null;
  const last = candles[candles.length - 1];
  const recentHighs = swings.filter((s) => s.type === 'high').slice(-3);
  const recentLows = swings.filter((s) => s.type === 'low').slice(-3);
  if (recentHighs.length >= 2 && last.c > recentHighs[recentHighs.length - 1].price) return 'BOS_ALTA';
  if (recentLows.length >= 2 && last.c < recentLows[recentLows.length - 1].price) return 'BOS_BAIXA';
  return null;
}

function detectCHoCH(candles: Candle[], swings: SwingPoint[]): string | null {
  if (swings.length < 4) return null;
  const last = candles[candles.length - 1];
  const recentHighs = swings.filter((s) => s.type === 'high').slice(-3);
  const recentLows = swings.filter((s) => s.type === 'low').slice(-3);
  if (recentLows.length >= 2) {
    const wasBearish = recentLows[1].price < recentLows[0].price;
    if (wasBearish && recentHighs.length >= 1 && last.c > recentHighs[recentHighs.length - 1].price) return 'CHOCH_ALTA';
  }
  if (recentHighs.length >= 2) {
    const wasBullish = recentHighs[1].price > recentHighs[0].price;
    if (wasBullish && recentLows.length >= 1 && last.c < recentLows[recentLows.length - 1].price) return 'CHOCH_BAIXA';
  }
  return null;
}

function findFVGs(candles: Candle[]): Array<{ type: 'bullish' | 'bearish'; high: number; low: number }> {
  const fvgs: Array<{ type: 'bullish' | 'bearish'; high: number; low: number }> = [];
  for (let i = 2; i < candles.length; i++) {
    const c0 = candles[i - 2];
    const c2 = candles[i];
    if (c2.l > c0.h) fvgs.push({ type: 'bullish', low: c0.h, high: c2.l });
    if (c2.h < c0.l) fvgs.push({ type: 'bearish', low: c2.h, high: c0.l });
  }
  return fvgs.slice(-3);
}

function findOrderBlocks(candles: Candle[], swings: SwingPoint[]): Array<{ type: 'bullish' | 'bearish'; high: number; low: number }> {
  const obs: Array<{ type: 'bullish' | 'bearish'; high: number; low: number }> = [];
  const swingLows = swings.filter((s) => s.type === 'low');
  for (const sl of swingLows.slice(-2)) {
    for (let i = sl.index - 1; i >= Math.max(0, sl.index - 5); i--) {
      if (candles[i].c < candles[i].o) { obs.push({ type: 'bullish', low: candles[i].l, high: candles[i].h }); break; }
    }
  }
  const swingHighs = swings.filter((s) => s.type === 'high');
  for (const sh of swingHighs.slice(-2)) {
    for (let i = sh.index - 1; i >= Math.max(0, sh.index - 5); i--) {
      if (candles[i].c > candles[i].o) { obs.push({ type: 'bearish', low: candles[i].l, high: candles[i].h }); break; }
    }
  }
  return obs;
}

function calcPremiumDiscount(candles: Candle[]): { level: string; fib382: number; fib500: number; fib618: number } {
  const lookback = Math.min(candles.length, 50);
  const slice = candles.slice(-lookback);
  const high = Math.max(...slice.map((c) => c.h));
  const low = Math.min(...slice.map((c) => c.l));
  const range = high - low;
  const last = slice[slice.length - 1].c;
  const position = range > 0 ? ((last - low) / range) * 100 : 50;
  return {
    level: position < 38 ? 'desconto' : position > 62 ? 'premium' : 'neutro',
    fib382: low + range * 0.382,
    fib500: low + range * 0.5,
    fib618: low + range * 0.618,
  };
}

function buildSnapshot(symbol: string, candles: Candle[]): string {
  const closes = candles.map((c) => c.c);
  const last = closes[closes.length - 1];
  const first = closes[0];
  const changePct = first ? ((last - first) / first) * 100 : 0;
  const high = Math.max(...candles.map((c) => c.h));
  const low = Math.min(...candles.map((c) => c.l));
  const rsi = rsi14(closes);
  const sma14 = sma(closes.slice(-14));
  const sma24 = sma(closes.slice(Math.max(0, closes.length - 24)));
  const trend = last > sma24 ? 'alta' : last < sma24 ? 'baixa' : 'lateral';
  const decimals = symbol.includes('JPY') ? 3 : symbol.includes('XAU') ? 2 : 5;

  const bb = bollingerBands(closes);
  const macdData = macd(closes);
  const atrVal = atr(candles);
  const atrPct = last > 0 ? (atrVal / last) * 100 : 0;

  const recentCloses = closes.slice(-5);
  const momentum = recentCloses.length >= 2
    ? ((recentCloses[recentCloses.length - 1] - recentCloses[0]) / recentCloses[0]) * 100
    : 0;

  const swings = findSwingPoints(candles);
  const bos = detectBOS(candles, swings);
  const choch = detectCHoCH(candles, swings);
  const fvgs = findFVGs(candles);
  const orderBlocks = findOrderBlocks(candles, swings);
  const pdZone = calcPremiumDiscount(candles);

  const swingHighs = swings.filter((s) => s.type === 'high').slice(-3);
  const swingLows = swings.filter((s) => s.type === 'low').slice(-3);

  return [
    `${symbol}:`,
    `preço ${last.toFixed(decimals)} | variação ${changePct.toFixed(2)}% | momentum ${momentum.toFixed(2)}%`,
    `máx ${high.toFixed(decimals)} | mín ${low.toFixed(decimals)} | range ${((high - low) / last * 100).toFixed(2)}%`,
    `SMA14 ${sma14.toFixed(decimals)} | SMA24 ${sma24.toFixed(decimals)} | ${trend}`,
    `RSI14 ${rsi.toFixed(1)} | ${rsi > 70 ? 'SOBRECOMPRADO' : rsi < 30 ? 'SOBREVENDIDO' : 'neutro'}`,
    `Bollinger: upper ${bb.upper.toFixed(decimals)} | mid ${bb.middle.toFixed(decimals)} | lower ${bb.lower.toFixed(decimals)} | width ${bb.width.toFixed(2)}%`,
    `MACD: ${macdData.macd.toFixed(decimals)} | signal ${macdData.signal.toFixed(decimals)} | hist ${macdData.histogram.toFixed(decimals)} | ${macdData.histogram > 0 ? 'bullish' : 'bearish'}`,
    `ATR14 ${atrVal.toFixed(decimals)} | volatilidade ${atrPct.toFixed(2)}%`,
    ``,
    `--- SMART MONEY CONCEPTS ---`,
    `Swing Highs: ${swingHighs.map((s) => s.price.toFixed(decimals)).join(', ') || 'nenhum'}`,
    `Swing Lows: ${swingLows.map((s) => s.price.toFixed(decimals)).join(', ') || 'nenhum'}`,
    `BOS: ${bos ?? 'nenhum'} | CHoCH: ${choch ?? 'nenhum'}`,
    `FVGs: ${fvgs.length > 0 ? fvgs.map((f) => `${f.type} ${f.low.toFixed(decimals)}-${f.high.toFixed(decimals)}`).join(', ') : 'nenhum'}`,
    `Order Blocks: ${orderBlocks.length > 0 ? orderBlocks.map((o) => `${o.type} ${o.low.toFixed(decimals)}-${o.high.toFixed(decimals)}`).join(', ') : 'nenhum'}`,
    `Zona: ${pdZone.level} | Fib38.2% ${pdZone.fib382.toFixed(decimals)} | Fib50% ${pdZone.fib500.toFixed(decimals)} | Fib61.8% ${pdZone.fib618.toFixed(decimals)}`,
  ].join('\n');
}

// ── Rule-based technical confirmation ──────────────────────────────────────

interface TechConfirmation { valid: boolean; score: number; reasons: string[]; warnings: string[] }

function validateSignalTechnical(
  symbol: string, signalType: 'BUY' | 'SELL', entry: number, sl: number, tp: number, candles: Candle[],
): TechConfirmation {
  const r: TechConfirmation = { valid: false, score: 0, reasons: [], warnings: [] };
  if (candles.length < 20) { r.warnings.push('Dados insuficientes'); r.valid = true; r.score = 50; return r; }
  const closes = candles.map((c) => c.c);
  const last = closes[closes.length - 1];
  let score = 0;

  // 1. RSI (20 pts)
  const rsiVal = rsi14(closes);
  if (signalType === 'BUY' && rsiVal < 40) { score += 20; r.reasons.push(`RSI sobrevendido: ${rsiVal.toFixed(1)}`); }
  else if (signalType === 'BUY' && rsiVal < 50) { score += 10; r.reasons.push(`RSI neutro-baixo: ${rsiVal.toFixed(1)}`); }
  else if (signalType === 'SELL' && rsiVal > 60) { score += 20; r.reasons.push(`RSI sobrecomprado: ${rsiVal.toFixed(1)}`); }
  else if (signalType === 'SELL' && rsiVal > 50) { score += 10; r.reasons.push(`RSI neutro-alto: ${rsiVal.toFixed(1)}`); }
  else { r.warnings.push(`RSI nao confirma: ${rsiVal.toFixed(1)}`); }

  // 2. Trend SMA (20 pts)
  const sma20 = sma(closes.slice(-20));
  const sma50 = closes.length >= 50 ? sma(closes.slice(-50)) : sma20;
  if (signalType === 'BUY' && last > sma20 && sma20 > sma50) { score += 20; r.reasons.push('Tendencia alta SMA20>SMA50'); }
  else if (signalType === 'SELL' && last < sma20 && sma20 < sma50) { score += 20; r.reasons.push('Tendencia baixa SMA20<SMA50'); }
  else if (signalType === 'BUY' && last > sma20) { score += 10; r.reasons.push('Preco acima SMA20'); }
  else if (signalType === 'SELL' && last < sma20) { score += 10; r.reasons.push('Preco abaixo SMA20'); }
  else { r.warnings.push('Preco contra tendencia SMA'); }

  // 3. MACD (15 pts)
  const macdData = macd(closes);
  if (signalType === 'BUY' && macdData.histogram > 0) { score += 15; r.reasons.push('MACD bullish'); }
  else if (signalType === 'SELL' && macdData.histogram < 0) { score += 15; r.reasons.push('MACD bearish'); }
  else { r.warnings.push('MACD nao confirma'); }

  // 4. SMC (25 pts)
  const swings = findSwingPoints(candles);
  const bos = detectBOS(candles, swings);
  const choch = detectCHoCH(candles, swings);
  if (signalType === 'BUY' && (bos === 'BOS_ALTA' || choch === 'CHOCH_ALTA')) {
    score += 25; r.reasons.push(`SMC: ${bos ?? choch}`);
  } else if (signalType === 'SELL' && (bos === 'BOS_BAIXA' || choch === 'CHOCH_BAIXA')) {
    score += 25; r.reasons.push(`SMC: ${bos ?? choch}`);
  } else if (bos || choch) { score += 5; r.warnings.push(`SMC contra: ${bos ?? choch}`); }
  else { r.warnings.push('Sem BOS/CHoCH'); }

  // 5. R:R (20 pts)
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  const rr = risk > 0 ? reward / risk : 0;
  if (rr >= 2.0) { score += 20; r.reasons.push(`R:R 1:${rr.toFixed(1)}`); }
  else if (rr >= 1.5) { score += 15; r.reasons.push(`R:R 1:${rr.toFixed(1)}`); }
  else if (rr >= 1.0) { score += 5; r.warnings.push(`R:R baixo 1:${rr.toFixed(1)}`); }

  // 6. Entry near key levels (bonus 10 pts)
  const fvgs = findFVGs(candles);
  const orderBlocks = findOrderBlocks(candles, swings);
  if (fvgs.some((f) => Math.abs(entry - (f.high + f.low) / 2) / entry < 0.002)) { score += 5; r.reasons.push('Entrada proxima a FVG'); }
  if (orderBlocks.some((o) => entry >= o.low && entry <= o.h)) { score += 5; r.reasons.push('Entrada em Order Block'); }

  r.score = Math.min(100, score);
  r.valid = r.score >= 45;
  return r;
}

// ── Spread buffer ──────────────────────────────────────────────────────────

function getSpreadBuffer(symbol: string): number {
  if (symbol.includes('JPY')) return 0.03;
  if (symbol.includes('XAU')) return 0.02;
  if (symbol.includes('BTC')) return 0.05;
  return 0.015;
}

function applySpreadBuffer(
  entry: number, sl: number, tp: number, signalType: 'BUY' | 'SELL', symbol: string,
): { entry: number; sl: number; tp: number } {
  const buffer = entry * getSpreadBuffer(symbol) / 100;
  if (signalType === 'BUY') {
    return { entry: Math.round((entry + buffer) * 10000) / 10000, sl: Math.round((sl - buffer) * 10000) / 10000, tp };
  }
  return { entry: Math.round((entry - buffer) * 10000) / 10000, sl: Math.round((sl + buffer) * 10000) / 10000, tp };
}

// ── Gemini prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(isWeekend: boolean, session: SessionInfo, existingSymbols: string[]): string {
  const sessionBlock = `
SESSÃO ATUAL: ${session.name}
Descrição: ${session.description}
Pares em destaque: ${session.pairs.join(', ')}
Volatilidade esperada: ${session.volatilityHint}
`;

  const dedupeBlock = existingSymbols.length > 0
    ? `\n⚠️ ESTES PARES JÁ TÊM SINAIS ATIVOS — NÃO REPETIR: ${existingSymbols.join(', ')}`
    : '';

  const smcRules = `
REGRAS SMART MONEY CONCEPTS (OBRIGATÓRIO):
- O setup DEVE ter confirmação de estrutura de mercado: BOS (Break of Structure) ou CHoCH (Change of Character).
- Entrada ideal: retração para Order Block ou preenchimento de Fair Value Gap (FVG) na zona de desconto (BUY) ou premium (SELL).
- Liquidez: identificar onde estão os stops (equal highs/lows, swing points). NÃO colocar SL em zonas óbvias de liquidez.
- SL deve estar ATRÁS do Order Block ou além do último swing point, NÃO em nível redondo.
- TP deve visar próxima zona de liquidez ou FVG oposto.
- Se não houver setup SMC claro com confirmação, responde: [] (array vazio).
- PREFERIR: R:R mínimo 1:2. Qualidade > quantidade. Melhor 1 sinal forte que 3 fracos.
`;

  if (isWeekend) {
    return `Tu és o analista técnico de IA do "The Magic Trader" (TMT). Gera sinais de trading para crypto (BTC, ETH) usando Smart Money Concepts.
${sessionBlock}${dedupeBlock}
REGRAS OBRIGATÓRIAS:
- Responde APENAS com JSON válido, sem markdown. Array de objetos:
  [{"symbol":"BTCUSDT","signal_type":"BUY","timeframe":"H1","entry_price":69000,"stop_loss":67500,"target_price":72000,"confidence":75,"reasons":["BOS bullish confirmado","Retração para order block em 68800","FVG preenchido"],"analysis":"Análise SMC detalhada em 2-3 frases com estrutura de mercado","smc_setup":"BOS"}]
- DIVERSIDADE OBRIGATÓRIA: Cada sinal deve ter par, timeframe OU direção DIFERENTE. NUNCA gerar 2 sinais para o mesmo par+timeframe.
- Timeframes: usa APENAS M15, H1 ou H4. Nunca M30.
- Gera 2 a 5 sinais APENAS de alta confiança. Se não houver setup SMC claro, responde: [] (array vazio).
- Confiança mínima: 55. Máxima: 95. NÃO confianças de 100.
- Campo "smc_setup" deve indicar o tipo de setup: "BOS", "CHoCH", "OB", "FVG" ou "COMBO".
${smcRules}
Dados de mercado abaixo.`;
  }

  return `Tu és o analista técnico de IA do "The Magic Trader" (TMT). Gera sinais de trading para forex e ouro usando Smart Money Concepts.
${sessionBlock}${dedupeBlock}
REGRAS OBRIGATÓRIAS:
- Responde APENAS com JSON válido, sem markdown. Array de objetos:
  [{"symbol":"EURUSD","signal_type":"BUY","timeframe":"H1","entry_price":1.0845,"stop_loss":1.0810,"target_price":1.0910,"confidence":75,"reasons":["BOS bullish confirmado","Retração para OB em 1.0840","FVG preenchido"],"analysis":"Análise SMC detalhada em 2-3 frases com estrutura de mercado","smc_setup":"BOS"}]
- DIVERSIDADE OBRIGATÓRIA: Cada sinal deve ter par, timeframe OU direção DIFERENTE. NUNCA gerar 2 sinais para o mesmo par+timeframe.
- Timeframes: usa APENAS M15, H1 ou H4. Nunca M30.
- Símbolos permitidos: EURUSD, GBPUSD, USDJPY, XAUUSD, EURGBP, USDCHF, AUDUSD, USDCAD, NZDUSD.
- OBRIGATÓRIO: pelo menos 1 sinal deve ser num par do plano free: EURUSD, GBPUSD, USDJPY, XAUUSD ou AUDUSD.
- Foca nos pares em destaque da sessão: ${session.pairs.join(', ')}.
- Gera 2 a 5 sinais APENAS de alta confiança. Se não houver setup SMC claro, responde: [] (array vazio).
- Confiança mínima: 55. Máxima: 95. NÃO confianças de 100.
- entry_price, stop_loss, target_price com a precisão normal do par (5 casas para forex, 2 para XAU).
- Campo "smc_setup" deve indicar o tipo de setup: "BOS", "CHoCH", "OB", "FVG" ou "COMBO".
${smcRules}
Dados de mercado abaixo.`;
}

// ── Signal validation ───────────────────────────────────────────────────────

const ALLOWED_FOREX = new Set(['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'EURGBP', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD']);
const ALLOWED_CRYPTO = new Set(['BTCUSD', 'BTCUSDT', 'ETHUSD', 'ETHUSDT']);
const ALLOWED_ALL = new Set([...ALLOWED_FOREX, ...ALLOWED_CRYPTO]);

interface ValidSignal {
  symbol: string;
  signal_type: string;
  timeframe: string;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  confidence: number;
  reasons: string[];
  analysis: string;
  smc_setup: string;
}

function parseSignals(text: string, isWeekend: boolean): ValidSignal[] {
  const debugLog: string[] = [];
  debugLog.push(`raw_len=${text.length}`);

  const cleaned = text.replace(/```(?:json)?/g, '').trim();
  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch { /* fall through */ }
    }
    if (!parsed) {
      let attempt = cleaned.replace(/,\s*$/, '').trim();
      // Tentar reparar JSON truncado: fechar string, array de reasons, objeto, array principal
      const repairs = ['"', ']', '}', ']'];
      for (const c of repairs) {
        attempt += c;
        try { parsed = JSON.parse(attempt); break; } catch { /* next */ }
      }
    }
    if (!parsed) {
      console.error('parseSignals failed', debugLog.join('; '));
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  const allowed = isWeekend ? ALLOWED_CRYPTO : ALLOWED_FOREX;
  const out: ValidSignal[] = [];
  for (const s of parsed) {
    if (!s || typeof s !== 'object') continue;
    const r = s as Record<string, unknown>;
    const rawSymbol = String(r.symbol ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const symbol = rawSymbol === 'BTCUSD' ? 'BTCUSDT' : rawSymbol === 'ETHUSD' ? 'ETHUSDT' : rawSymbol;
    if (!allowed.has(symbol)) continue;
    const type = String(r.signal_type ?? '').toUpperCase();
    if (type !== 'BUY' && type !== 'SELL') continue;
    const entry = Number(r.entry_price);
    const sl = Number(r.stop_loss);
    const tp = Number(r.target_price);
    const confidence = Number(r.confidence);
    if (![entry, sl, tp, confidence].every(Number.isFinite)) continue;
    if (entry <= 0 || sl === entry || tp === entry) continue;
    if (confidence < 55 || confidence > 100) continue;
    const tf = String(r.timeframe ?? 'H4').toUpperCase();
    if (!['M15', 'H1', 'H4'].includes(tf)) continue;
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    const rr = risk > 0 ? reward / risk : 0;
    if (risk === 0 || rr < 1.5) continue;
    const reasons = Array.isArray(r.reasons)
      ? r.reasons.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, 3)
      : [];
    if (reasons.length === 0) reasons.push('Sinal gerado por IA');
    const analysis = typeof r.analysis === 'string' ? r.analysis.trim().slice(0, 500) : `Sinal ${type} para ${symbol} na sessão atual.`;
    const validSetups = ['BOS', 'CHoCH', 'OB', 'FVG', 'COMBO'];
    const smcSetup = typeof r.smc_setup === 'string' && validSetups.includes(r.smc_setup.toUpperCase())
      ? r.smc_setup.toUpperCase() : 'COMBO';
    out.push({
      symbol,
      signal_type: type,
      timeframe: tf,
      entry_price: Math.round(entry * 10000) / 10000,
      stop_loss: Math.round(sl * 10000) / 10000,
      target_price: Math.round(tp * 10000) / 10000,
      confidence: Math.round(confidence),
      reasons,
      analysis,
      smc_setup: smcSetup,
    });
    if (out.length >= 5) break;
  }
  return out;
}

// ── Main ────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorJson('Método não permitido.', 405);
  if (!geminiApiKey) return errorJson('GEMINI_API_KEY não configurada.', 500);

  const weekend = isWeekendUtc();
  const pairs = getActivePairs();
  const session = detectSession(new Date());

  // 1. Fetch existing active signals for deduplication
  let existingSymbols: string[] = [];
  try {
    const { data: existing } = await supabase
      .from('signals')
      .select('symbol, timeframe, signal_type')
      .in('status', ['active', 'pending']);
    if (existing && existing.length > 0) {
      existingSymbols = existing.map((s: any) => `${s.symbol}_${s.timeframe}_${s.signal_type}`);
      console.log(` sinais existentes: ${existing.length} (${existing.map((s: any) => s.symbol).join(', ')})`);
    }
  } catch (e) {
    console.error('erro ao buscar sinais existentes', e);
  }

  // 2. Fetch market data (com delay entre pedidos Twelve Data para evitar 429)
  const candlesBySymbol: Record<string, Candle[]> = {};
  for (let i = 0; i < pairs.length; i++) {
    const symbol = pairs[i];
    try {
      candlesBySymbol[symbol] = await fetchCandles(symbol);
    } catch (e) {
      console.error(`falha ao buscar ${symbol}`, e);
    }
    if (i < pairs.length - 1) await new Promise((r) => setTimeout(r, 7000));
  }

  const fetchedSymbols = Object.keys(candlesBySymbol);
  if (fetchedSymbols.length === 0) return errorJson('Não foi possível obter dados de mercado.', 502);

  const snapshot = fetchedSymbols.map((s) => buildSnapshot(s, candlesBySymbol[s])).join('\n\n');

  // 3. Build prompt with deduplication context
  const systemPrompt = buildSystemPrompt(weekend, session, existingSymbols);
  const marketRule = weekend
    ? 'Mercado forex fechado. Crypto negocia 24/7.'
    : `Mercado forex aberto. Sessão: ${session.name}.`;
  const prompt = `${marketRule}\n\n${snapshot}\n\nResponde com o array JSON dos sinais (ou [] se não houver oportunidades). LEMBRA: diversidade obrigatória de pares e timeframes.`;

  // 4. Call Gemini
  let reply = '';
  const triedModels: string[] = [];
  for (const modelName of MODEL_FALLBACKS) {
    triedModels.push(modelName);
    try {
      const res = await fetch(`${apiBase}/models/${modelName}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiApiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(`Gemini ${modelName} error ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
        continue;
      }
      const parts: Array<{ text?: string }> = data?.candidates?.[0]?.content?.parts ?? [];
      reply = parts.filter((p) => typeof p?.text === 'string').map((p) => (p.text as string).trim()).filter(Boolean).join('\n');
      const finishReason = data?.candidates?.[0]?.finishReason;
      console.log(`Gemini ${modelName}: ${reply.length} chars, finish=${finishReason}, session=${session.name}`);
      if (reply.length > 100 && (reply.startsWith('[') || reply.startsWith('{'))) break;
    } catch (err: unknown) {
      console.error(`Gemini ${modelName} exception`, err);
      continue;
    }
  }
  if (!reply) return json({ error: 'IA falhou em todos os modelos', triedModels }, 502);

  // 5. Parse, validate technically, and deduplicate
  const valid = parseSignals(reply, weekend);
  if (valid.length === 0) return json({ signals: [], reply: reply.slice(0, 3000), session: session.name });

  // Rule-based technical confirmation
  const techValidated = valid.filter((s) => {
    const candles = candlesBySymbol[s.symbol];
    if (!candles) return false;
    const conf = validateSignalTechnical(s.symbol, s.signal_type as 'BUY' | 'SELL', s.entry_price, s.stop_loss, s.target_price, candles);
    if (!conf.valid) { console.log(` tech-reject ${s.symbol} ${s.signal_type}: score=${conf.score}`); return false; }
    s.reasons = [...conf.reasons.slice(0, 2), ...s.reasons].slice(0, 3);
    return true;
  });
  if (techValidated.length === 0) return json({ signals: [], tech_rejected: valid.length, session: session.name });

  const filtered = techValidated.filter((s) => {
    const key = `${s.symbol}_${s.timeframe}_${s.signal_type}`;
    if (existingSymbols.includes(key)) { console.log(` dedup: skipped ${key}`); return false; }
    return true;
  });
  if (filtered.length === 0) return json({ signals: [], skipped: valid.length, session: session.name });

  // 6. Apply spread buffer and determine initial status
  const rows = filtered.map((s) => {
    const buffered = applySpreadBuffer(s.entry_price, s.stop_loss, s.target_price, s.signal_type as 'BUY' | 'SELL', s.symbol);
    const currentPrice = candlesBySymbol[s.symbol]?.[candlesBySymbol[s.symbol].length - 1]?.c;
    let status = 'pending';
    if (currentPrice && currentPrice > 0) {
      const diff = Math.abs(currentPrice - buffered.entry);
      const entryPct = buffered.entry > 0 ? (diff / buffered.entry) * 100 : 999;
      if (entryPct <= 0.15) status = 'active';
    }
    return {
      symbol: s.symbol, timeframe: s.timeframe, signal_type: s.signal_type,
      entry_price: buffered.entry, stop_loss: buffered.sl, target_price: buffered.tp,
      confidence: s.confidence, reasons: s.reasons, analysis: s.analysis,
      smc_setup: s.smc_setup, status, expires_at: nextExpiry(new Date(), s.timeframe),
    };
  });

  const { data, error } = await supabase.from('signals').insert(rows).select();
  if (error) {
    console.error('insert falhou:', JSON.stringify({ message: error.message, details: error.details, hint: error.hint, code: error.code }));
    return json({ error: 'insert failed', details: error.message, code: error.code }, 500);
  }

  console.log(`criados ${data?.length ?? 0} sinais ${weekend ? 'crypto' : 'forex'} [sessão: ${session.name}] (skipped ${valid.length - filtered.length} duplicados)`);
  return json({ signals: data ?? [], session: session.name, skipped: valid.length - filtered.length });
});
