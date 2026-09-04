/* ── Sessão de mercado ──────────────────────────────────────── */
// Forex fecha sexta às 22:00 UTC e reabre segunda às 00:00 UTC.
// Durante o encerramento, apenas pares de crypto continuam ativos.

export function isForexSessionOpen(now: Date = new Date()): boolean {
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;
  if (day === 5 && now.getUTCHours() >= 22) return false;
  return true;
}

export function isCryptoPair(pair: string): boolean {
  return /^(BTC|ETH)/i.test(pair.replace(/[^A-Za-z]/g, ''));
}

// Fallback quando a lista pedida não tem nenhum par crypto (ex.: fim de semana).
export const DEFAULT_CRYPTO_PAIRS = ['BTC/USD', 'ETH/USD'];

export function livePairs(pairs: string[], marketOpen: boolean): string[] {
  if (marketOpen) return pairs;
  return pairs.filter((p) => isCryptoPair(p));
}
