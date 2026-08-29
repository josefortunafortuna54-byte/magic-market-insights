import type { SignalType } from '@/lib/types';

export function formatSymbol(symbol: string): string {
  if (!symbol) return 'N/A';
  if (symbol.includes('/')) return symbol;
  if (symbol.length === 6) return symbol.slice(0, 3) + '/' + symbol.slice(3);
  return symbol;
}

export function formatTimeframe(tf: string): string {
  if (!tf) return 'H1';
  const map: Record<string, string> = {
    '1m': 'M1', '5m': 'M5', '15m': 'M15', '30m': 'M30',
    '1h': 'H1', '4h': 'H4', '1d': 'D1',
    M1: 'M1', M5: 'M5', M15: 'M15', M30: 'M30',
    H1: 'H1', H4: 'H4', D1: 'D1',
  };
  return map[tf] ?? tf.toUpperCase();
}

export function formatType(type: string): SignalType {
  const upper = (type || '').toUpperCase();
  if (upper === 'BUY') return 'BUY';
  if (upper === 'SELL') return 'SELL';
  return 'AGUARDAR';
}

export function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'agora mesmo';
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
}

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;

const MONTH_NAMES: Record<(typeof MONTH_KEYS)[number], string> = {
  january: 'Janeiro', february: 'Fevereiro', march: 'Março', april: 'Abril', may: 'Maio', june: 'Junho',
  july: 'Julho', august: 'Agosto', september: 'Setembro', october: 'Outubro', november: 'Novembro', december: 'Dezembro',
};

export function formatLongDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} de ${MONTH_NAMES[MONTH_KEYS[d.getMonth()]]} de ${d.getFullYear()}`;
}

export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function formatMoney(n: number): string {
  if (!isFinite(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatBancaMoney(n: number, currency: 'usd' | 'aoa' = 'usd'): string {
  if (currency === 'aoa') return `${Math.round(n).toLocaleString('pt-PT')} Kz`;
  return `$${formatMoney(n)}`;
}

/**
 * Número de casas decimais usadas para apresentar o preço de um par.
 */
export function decimalsFor(pair: string): number {
  return pair.includes('JPY') ? 3 : (pair.includes('XAU') || pair.includes('BTC')) ? 2 : 5;
}
