import { useState, useEffect } from "react";

interface PriceData {
  price: string;
  change: number;
}

const PAIR_CONFIG: Record<string, { base?: string; quote?: string; coingecko?: string; decimals: number }> = {
  "EUR/USD": { base: "EUR", quote: "USD", decimals: 5 },
  "GBP/USD": { base: "GBP", quote: "USD", decimals: 5 },
  "USD/JPY": { base: "USD", quote: "JPY", decimals: 3 },
  "AUD/USD": { base: "AUD", quote: "USD", decimals: 5 },
  "EUR/GBP": { base: "EUR", quote: "GBP", decimals: 5 },
  "USD/CHF": { base: "USD", quote: "CHF", decimals: 5 },
  "NZD/USD": { base: "NZD", quote: "USD", decimals: 5 },
  "USD/CAD": { base: "USD", quote: "CAD", decimals: 5 },
  "XAU/USD": { base: "XAU", quote: "USD", decimals: 2 },
  "BTC/USD": { coingecko: "bitcoin", decimals: 2 },
};

async function fetchForexPrice(base: string, quote: string): Promise<{ price: number; change: number }> {
  const res = await fetch(`https://api.frankfurter.app/latest?from=${base}&to=${quote}`);
  const json = await res.json();
  const price = Number(json?.rates?.[quote]);
  if (!price || isNaN(price)) throw new Error("Invalid");

  // Yesterday for change %
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split("T")[0];
  const res2 = await fetch(`https://api.frankfurter.app/${yStr}?from=${base}&to=${quote}`);
  const json2 = await res2.json();
  const prevPrice = Number(json2?.rates?.[quote]);
  const change = prevPrice ? ((price - prevPrice) / prevPrice) * 100 : 0;

  return { price, change };
}

async function fetchBTCPrice(): Promise<{ price: number; change: number }> {
  const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true");
  const json = await res.json();
  const price = Number(json?.bitcoin?.usd);
  const change = Number(json?.bitcoin?.usd_24h_change);
  if (!price || isNaN(price)) throw new Error("Invalid");
  return { price, change: isNaN(change) ? 0 : change };
}

async function fetchPairPrice(pair: string): Promise<PriceData> {
  const config = PAIR_CONFIG[pair];
  if (!config) return { price: "—", change: 0 };

  try {
    let result: { price: number; change: number };

    if (config.coingecko) {
      result = await fetchBTCPrice();
    } else if (config.base && config.quote) {
      result = await fetchForexPrice(config.base, config.quote);
    } else {
      return { price: "—", change: 0 };
    }

    const formatted = result.price.toFixed(config.decimals);
    return { price: formatted, change: Math.round(result.change * 100) / 100 };
  } catch {
    return { price: "—", change: 0 };
  }
}

export function useLivePrices(pairs: string[]) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const results: Record<string, PriceData> = {};
    await Promise.allSettled(
      pairs.map(async (pair) => {
        results[pair] = await fetchPairPrice(pair);
      })
    );
    setPrices(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60_000); // refresh every 60s
    return () => clearInterval(interval);
  }, [pairs.join(",")]);

  return { prices, loading, refetch: fetchAll };
}
