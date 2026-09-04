import { useCallback, useEffect, useRef, useState } from 'react';
import type { PriceData } from '@/core/types';
import { isCryptoPair, isForexSessionOpen, DEFAULT_CRYPTO_PAIRS } from '@/core/markets';

/* ── config ─────────────────────────────────────────────────── */

const TD_KEY = process.env.EXPO_PUBLIC_TWELVE_DATA_KEY ?? '';

const PAIR_DECIMALS: Record<string, number> = {
  'BTC/USD': 2,
  'ETH/USD': 2,
  'USD/JPY': 3,
  'XAU/USD': 2,
};

function dec(pair: string): number {
  return PAIR_DECIMALS[pair] ?? 5;
}

/* ── Binance fallback maps (stablecoin proxies) ─────────────── */

const BINANCE_HTTP: Record<string, string> = {
  'EUR/USD': 'EURUSDT',
  'GBP/USD': 'GBPUSDT',
  'USD/JPY': 'BTCJPY',
  'AUD/USD': 'AUDUSDT',
  'NZD/USD': 'NZDUSDT',
  'USD/CHF': 'CHFUSDT',
  'USD/CAD': 'CADUSDT',
  'BTC/USD': 'BTCUSDT',
  'ETH/USD': 'ETHUSDT',
  'XAU/USD': 'PAXGUSDT',
};

const BINANCE_WS: Record<string, string> = {
  'EUR/USD': 'eurusdt',
  'GBP/USD': 'gbpusdt',
  'AUD/USD': 'audusdt',
  'NZD/USD': 'nzdusdt',
  'USD/CHF': 'chfusdt',
  'USD/CAD': 'cadusdt',
  'BTC/USD': 'btcusdt',
  'ETH/USD': 'ethusdt',
  'XAU/USD': 'paxgusdt',
};

function needsCross(pair: string): boolean {
  return pair === 'USD/JPY';
}

/* ── XAUS: free gold spot (no key) ──────────────────────────── */

async function fetchXausSpot(): Promise<number | null> {
  try {
    const res = await fetch('https://xaus.com/api/v1/spot?compact=1');
    if (!res.ok) return null;
    const d = await res.json();
    const price = Number(d.spot_usd_oz);
    return price > 0 && !isNaN(price) ? price : null;
  } catch {
    return null;
  }
}

/* ── Twelve Data REST: initial prices + 24h change ─────────── */

async function fetchTdTimeSeries(
  pairs: string[],
): Promise<Record<string, PriceData>> {
  if (!TD_KEY || pairs.length === 0) return {};

  const out: Record<string, PriceData> = {};

  const results = await Promise.allSettled(
    pairs.map(async (pair) => {
      const res = await fetch(
        `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(pair)}&interval=1day&outputsize=2&apikey=${TD_KEY}`,
      );
      if (!res.ok) return null;
      const data = await res.json();
      const values: Array<{ close: string }> = data?.values;
      if (!Array.isArray(values) || values.length < 1) return null;

      const current = Number(values[0]?.close);
      const prev = values.length >= 2 ? Number(values[1]?.close) : current;
      if (!current || isNaN(current)) return null;

      const change = prev > 0 ? ((current - prev) / prev) * 100 : 0;
      return {
        pair,
        price: current.toFixed(dec(pair)),
        change: Math.round(change * 100) / 100,
      };
    }),
  );

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      out[r.value.pair] = { price: r.value.price, change: r.value.change };
    }
  }
  return out;
}

/* ── Twelve Data WebSocket: real-time forex + gold ──────────── */

function connectTdWs(
  symbols: string[],
  onPrice: (pair: string, price: number) => void,
): WebSocket | null {
  if (!TD_KEY || symbols.length === 0) return null;

  const url = `wss://ws.twelvedata.com/v1/quotes/price?apikey=${TD_KEY}`;

  try {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          action: 'subscribe',
          params: { symbols: symbols.join(',') },
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data));
        if (msg.event !== 'price' || !msg.symbol || !msg.price) return;
        const price = Number(msg.price);
        if (price <= 0 || isNaN(price)) return;
        onPrice(msg.symbol, price);
      } catch { /* ignore */ }
    };

    return ws;
  } catch {
    return null;
  }
}

/* ── Binance batch (fallback) ───────────────────────────────── */

async function fetchBinanceBatch(
  pairs: string[],
): Promise<Record<string, PriceData>> {
  const entries = pairs
    .map((p) => ({ pair: p, sym: BINANCE_HTTP[p] }))
    .filter((x) => x.sym);
  if (entries.length === 0) return {};

  const syms = entries.map((x) => x.sym!);
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(syms)}`;
  const res = await fetch(url);
  if (!res.ok) return {};

  const tickers: Array<{
    symbol: string;
    lastPrice: string;
    priceChangePercent: string;
  }> = await res.json();
  const bySym = new Map(tickers.map((t) => [t.symbol, t]));

  const out: Record<string, PriceData> = {};

  let btcUsdt = 0;
  const btct = bySym.get('BTCUSDT');
  if (btct) btcUsdt = Number(btct.lastPrice);

  for (const { pair, sym } of entries) {
    const t = bySym.get(sym!);
    if (!t) continue;

    let price = Number(t.lastPrice);
    let change = Number(t.priceChangePercent);

    if (needsCross(pair) && btcUsdt > 0 && sym === 'BTCJPY') {
      price = price / btcUsdt;
      change =
        (Number(bySym.get('BTCJPY')?.priceChangePercent) || 0) -
        (Number(btct?.priceChangePercent) || 0);
    }

    if (price > 0 && !isNaN(price)) {
      out[pair] = {
        price: price.toFixed(dec(pair)),
        change: Math.round(change * 100) / 100,
      };
    }
  }
  return out;
}

function connectBinanceWs(
  pairs: string[],
  onPrice: (pair: string, price: number, change: number) => void,
): WebSocket | null {
  const streams = pairs.map((p) => BINANCE_WS[p]).filter(Boolean);
  if (streams.length === 0) return null;

  const url = `wss://stream.binance.com:9443/stream?streams=${streams.join('/')}`;

  try {
    const ws = new WebSocket(url);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data));
        const data = msg.data;
        if (!data?.s) return;

        const symLower = data.s.toLowerCase();
        const pair = pairs.find((p) => BINANCE_WS[p] === symLower);
        if (!pair) return;

        const price = Number(data.c);
        const change = Number(data.P);
        if (price <= 0 || isNaN(price)) return;

        onPrice(pair, price, Math.round(change * 100) / 100);
      } catch { /* ignore */ }
    };

    return ws;
  } catch {
    return null;
  }
}

/* ── Hook ───────────────────────────────────────────────────── */

export function useLivePrices(pairs: string[]) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [marketOpen, setMarketOpen] = useState(() => isForexSessionOpen());
  const wsRef = useRef<WebSocket | null>(null);
  const prevRef = useRef<Record<string, PriceData>>({});

  // Reavalia a sessão a cada 60s: sexta 22:00 → só crypto até segunda.
  useEffect(() => {
    const id = setInterval(() => setMarketOpen(isForexSessionOpen()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Fora da sessão forex, mantém só crypto; se a lista não tiver nenhuma,
  // usa o fallback (BTC/ETH) para que a área do ticker nunca desapareça.
  const tradablePairs = marketOpen
    ? pairs
    : pairs.filter((p) => isCryptoPair(p)).length > 0
      ? pairs.filter((p) => isCryptoPair(p))
      : DEFAULT_CRYPTO_PAIRS;
  const pairsKey = tradablePairs.join(',');

  const updatePrice = useCallback(
    (pair: string, pd: PriceData) => {
      prevRef.current = { ...prevRef.current, [pair]: pd };
      setPrices((prev) => ({ ...prev, [pair]: pd }));
    },
    [],
  );

  useEffect(() => {
    let active = true;
    const intervals: ReturnType<typeof setInterval>[] = [];
    const webSockets: WebSocket[] = [];

    const cleanupAll = () => {
      active = false;
      webSockets.forEach((ws) => ws.close());
      intervals.forEach((id) => clearInterval(id));
      wsRef.current = null;
    };

    const tdPairs = TD_KEY
      ? tradablePairs.filter((p) => p !== 'BTC/USD' && p !== 'ETH/USD')
      : [];
    const binancePairs = TD_KEY
      ? tradablePairs.filter((p) => p === 'BTC/USD' || p === 'ETH/USD')
      : tradablePairs;

    (async () => {
      if (TD_KEY && tdPairs.length > 0) {
        // ── Twelve Data path ──
        const tdResults = await fetchTdTimeSeries(tdPairs);
        if (!active) return;

        // XAU/USD: try XAUS if Twelve Data didn't return it
        if (tdPairs.includes('XAU/USD') && !tdResults['XAU/USD']) {
          const xauPrice = await fetchXausSpot();
          if (xauPrice && active) {
            tdResults['XAU/USD'] = { price: xauPrice.toFixed(2), change: 0 };
          }
        }

        const binanceResults =
          binancePairs.length > 0 ? await fetchBinanceBatch(binancePairs) : {};
        if (!active) return;

        const all = { ...binanceResults, ...tdResults };
        if (Object.keys(all).length > 0) {
          prevRef.current = all;
          setPrices(all);
        }
        setLoading(false);

        // ── WebSocket: Twelve Data (forex + gold) ──
        const tdWs = connectTdWs(tdPairs, (pair, price) => {
          if (!active) return;
          const prev = prevRef.current[pair];
          updatePrice(pair, {
            price: price.toFixed(dec(pair)),
            change: prev?.change ?? 0,
          });
        });
        if (tdWs) webSockets.push(tdWs);
        wsRef.current = tdWs;

        // ── WebSocket: Binance (crypto) ──
        const bnWs = connectBinanceWs(binancePairs, (pair, price, change) => {
          if (!active) return;
          updatePrice(pair, { price: price.toFixed(dec(pair)), change });
        });
        if (bnWs) webSockets.push(bnWs);

        // ── Poll XAUS for gold every 30s ──
        if (tdPairs.includes('XAU/USD')) {
          intervals.push(
            setInterval(async () => {
              if (!active) return;
              const xauPrice = await fetchXausSpot();
              if (xauPrice && active) {
                const prev = prevRef.current['XAU/USD'];
                updatePrice('XAU/USD', {
                  price: xauPrice.toFixed(2),
                  change: prev?.change ?? 0,
                });
              }
            }, 30_000),
          );
        }

        // ── Refresh 24h change every 5 min ──
        intervals.push(
          setInterval(async () => {
            if (!active) return;
            const updated = await fetchTdTimeSeries(tdPairs);
            if (!active) return;
            for (const [pair, pd] of Object.entries(updated)) {
              const curr = prevRef.current[pair];
              if (curr) updatePrice(pair, { ...curr, change: pd.change });
            }
          }, 300_000),
        );
      } else {
        // ── Binance-only fallback ──
        const results = await fetchBinanceBatch(tradablePairs);
        if (!active) return;

        if (Object.keys(results).length > 0) {
          prevRef.current = results;
          setPrices(results);
        }
        setLoading(false);

        const ws = connectBinanceWs(tradablePairs, (pair, price, change) => {
          if (!active) return;
          updatePrice(pair, { price: price.toFixed(dec(pair)), change });
        });
        if (ws) webSockets.push(ws);
        wsRef.current = ws;

        intervals.push(
          setInterval(async () => {
            const r = await fetchBinanceBatch(tradablePairs);
            if (!active) return;
            if (Object.keys(r).length > 0) {
              prevRef.current = { ...prevRef.current, ...r };
              setPrices((prev) => ({ ...prev, ...r }));
            }
          }, 5_000),
        );
      }
    })();

    return cleanupAll;
  }, [pairsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(async () => {
    setLoading(true);
    let results: Record<string, PriceData>;

    if (TD_KEY) {
      const tdPairs = tradablePairs.filter((p) => p !== 'BTC/USD' && p !== 'ETH/USD');
      const binancePairs = tradablePairs.filter((p) => p === 'BTC/USD' || p === 'ETH/USD');

      const [td, bn] = await Promise.all([
        fetchTdTimeSeries(tdPairs),
        binancePairs.length > 0 ? fetchBinanceBatch(binancePairs) : Promise.resolve({}),
      ]);
      results = { ...bn, ...td };
    } else {
      results = await fetchBinanceBatch(tradablePairs);
    }

    if (Object.keys(results).length > 0) {
      prevRef.current = results;
      setPrices(results);
    }
    setLoading(false);
  }, [pairsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { prices, loading, refetch, marketOpen, activePairs: tradablePairs };
}
