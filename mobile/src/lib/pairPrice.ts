/* Single-pair live price + pip helpers for the trade journal. */

export function pairDecimals(pair: string): number {
  switch (pair) {
    case 'XAU/USD':
      return 2;
    case 'USD/JPY':
      return 3;
    default:
      return 5;
  }
}

/** Price change that counts as one pip for the pair. */
export function pipSize(pair: string): number {
  if (pair === 'USD/JPY') return 0.01;
  if (pair === 'XAU/USD') return 0.1;
  if (pair === 'BTC/USD' || pair === 'ETH/USD') return 1;
  return 0.0001;
}

const BINANCE_HTTP: Record<string, string> = {
  'EUR/USD': 'EURUSDT',
  'GBP/USD': 'GBPUSDT',
  'USD/JPY': 'BTCJPY',
  'AUD/USD': 'AUDUSDT',
  'NZD/USD': 'NZDUSDT',
  'USD/CHF': 'CHFUSDT',
  'USD/CAD': 'CADUSDT',
  'XAU/USD': 'PAXGUSDT',
};

async function binancePrice(symbol: string): Promise<number | null> {
  const res = await fetch(
    `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
  );
  if (!res.ok) return null;
  const data = await res.json();
  const price = Number(data.price);
  return price > 0 && !isNaN(price) ? price : null;
}

async function xausSpot(): Promise<number | null> {
  const res = await fetch('https://xaus.com/api/v1/spot?compact=1');
  if (!res.ok) return null;
  const data = await res.json();
  const price = Number(data.spot_usd_oz);
  return price > 0 && !isNaN(price) ? price : null;
}

/** Current spot price suggestion for a pair, or null when unavailable. */
export async function fetchPairPrice(pair: string): Promise<number | null> {
  try {
    if (pair === 'EUR/GBP') {
      const [eur, gbp] = await Promise.all([
        binancePrice('EURUSDT'),
        binancePrice('GBPUSDT'),
      ]);
      if (eur && gbp) {
        const cross = eur / gbp;
        return isFinite(cross) && cross > 0 ? cross : null;
      }
      return null;
    }

    if (pair === 'XAU/USD') {
      const spot = await xausSpot();
      if (spot) return spot;
      return binancePrice('PAXGUSDT');
    }

    const sym = BINANCE_HTTP[pair];
    if (!sym) return null;

    let price = await binancePrice(sym);
    if (!price) return null;

    if (pair === 'USD/JPY') {
      const btc = await binancePrice('BTCUSDT');
      if (!btc) return null;
      price = price / btc;
    }

    return isFinite(price) && price > 0 ? price : null;
  } catch {
    return null;
  }
}

/** Signed pip count between entry and exit for the given direction/pair. */
export function calcPips(
  pair: string,
  direction: 'BUY' | 'SELL',
  entry: number,
  exit: number,
): number {
  const raw = direction === 'BUY' ? exit - entry : entry - exit;
  return Math.round((raw / pipSize(pair)) * 100) / 100;
}
