import type { User } from '@supabase/supabase-js';
import { i18n } from '@/lib/i18n';
import type { SignalType } from './types';

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

export function formatNumber(n: number, decimals = 5): string {
  if (!isFinite(n)) return '—';
  return n.toFixed(decimals);
}

export function formatPrice(n: number, decimals = 2): string {
  if (!isFinite(n)) return '—';
  return n.toFixed(decimals);
}

export function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return i18n.t('format.now');
  if (diff < 3600) return i18n.t('format.minutesAgo', { count: Math.floor(diff / 60) });
  if (diff < 86400) return i18n.t('format.hoursAgo', { count: Math.floor(diff / 3600) });
  return i18n.t('format.daysAgo', { count: Math.floor(diff / 86400) });
}

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;

export function formatLongDate(dateStr: string): string {
  const d = new Date(dateStr);
  return i18n.t('format.longDate', {
    day: d.getDate(),
    month: i18n.t(`format.months.${MONTH_KEYS[d.getMonth()]}`),
    year: d.getFullYear(),
  });
}

export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function formatChatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return i18n.t('format.today');
  if (sameDay(d, yesterday)) return i18n.t('format.yesterday');
  return formatLongDate(dateStr);
}

export function formatDateTimeWAT(dateStr: string): string {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return i18n.t('format.datetimeWAT', { dd, mm, yyyy: d.getFullYear(), hh, min });
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function isSyntheticEmail(email?: string): boolean {
  return !!email && email.endsWith('@tmt.local');
}

export function contactInfo(user: { user_metadata?: Record<string, unknown>; email?: string; phone?: string } | null): string | null {
  if (user?.phone) return user.phone;
  if (user?.email && !isSyntheticEmail(user.email)) return user.email;
  return null;
}

export function displayName(user: { user_metadata?: Record<string, unknown>; email?: string; phone?: string } | null): string {
  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const full = typeof meta?.full_name === 'string' ? meta.full_name : '';
  if (full) return full;
  if (user?.phone) return user.phone;
  const email = user?.email || '';
  if (isSyntheticEmail(email)) return i18n.t('common.trader');
  return email.split('@')[0] || i18n.t('common.trader');
}

export function avatarLetter(user: { user_metadata?: Record<string, unknown>; email?: string } | null): string {
  return (displayName(user) || 'T')[0].toUpperCase();
}

export function avatarUrl(user: User | null): string | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const idData = (user.identities?.[0]?.identity_data ?? {}) as Record<string, unknown>;
  const candidates = [meta.avatar_url, meta.picture, idData.avatar_url, idData.picture];
  for (const c of candidates) {
    if (typeof c === 'string' && /^https?:\/\//.test(c.trim())) return c.trim();
  }
  return null;
}

export function isEmailVerified(user: User | null): boolean {
  if (!user) return false;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  if (typeof meta.email_verified === 'boolean') return meta.email_verified;
  const idData = (user.identities?.[0]?.identity_data ?? {}) as Record<string, unknown>;
  if (typeof idData.email_verified === 'boolean') return idData.email_verified;
  return Boolean(user.email_confirmed_at);
}

export function formatPips(n: number): string {
  if (!isFinite(n)) return '—';
  const v = Math.round(n * 10) / 10;
  return v > 0 ? `+${v}` : `${v}`;
}

export function formatMoney(n: number): string {
  if (!isFinite(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Formata valores da gestão de capital respeitando a moeda (USD/Kz). */
export function formatBancaMoney(n: number, currency: 'usd' | 'aoa' = 'usd'): string {
  if (!isFinite(n)) return '—';
  if (currency === 'aoa') return `${Math.round(n).toLocaleString('pt-PT')} Kz`;
  return `$${formatMoney(n)}`;
}
