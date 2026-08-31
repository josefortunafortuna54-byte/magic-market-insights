export function getPipMultiplier(symbol: string): number {
  if (!symbol) return 10000;
  if (symbol.includes('JPY')) return 100;
  if (symbol.includes('XAU')) return 100;
  if (symbol.includes('BTC')) return 1;
  return 10000;
}

export function calcPips(
  entry: number,
  tp: number,
  sl: number,
  status: 'tp' | 'sl' | 'expired' | string,
  symbol: string,
): number {
  const mult = getPipMultiplier(symbol);
  if (status === 'expired' || status === 'manual') return 0;
  if (status === 'tp') return Math.abs(tp - entry) * mult;
  return -Math.abs(entry - sl) * mult;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function pipsBetween(a: number, b: number, symbol: string): number {
  return Math.abs(a - b) * getPipMultiplier(symbol);
}

export function calcOpenPips(
  entry: number,
  current: number,
  type: 'BUY' | 'SELL' | 'AGUARDAR',
  symbol: string,
): number {
  if (!isFinite(entry) || !isFinite(current) || entry === 0) return NaN;
  const mult = getPipMultiplier(symbol);
  const diff = type === 'SELL' ? entry - current : current - entry;
  return round1(diff * mult);
}

export function pipSize(pair: string): number {
  if (pair === 'USD/JPY') return 0.01;
  if (pair === 'XAU/USD') return 0.1;
  if (pair === 'BTC/USD' || pair === 'ETH/USD') return 1;
  return 0.0001;
}

export function calcTradePips(
  pair: string,
  direction: 'BUY' | 'SELL',
  entry: number,
  exit: number,
): number {
  const raw = direction === 'BUY' ? exit - entry : entry - exit;
  return Math.round((raw / pipSize(pair)) * 100) / 100;
}
