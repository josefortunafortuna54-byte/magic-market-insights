const API_KEY = process.env.EXPO_PUBLIC_FOREX_CALENDAR_KEY ?? '';
const BASE = 'https://api.forex-calendar.pro/api';

export type ImpactLevel = 'high' | 'medium' | 'low' | 'holiday';

export interface EconomicEvent {
  date: string;
  time: string;
  currency: string;
  impact: ImpactLevel;
  event: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  originalTime: string;
  timezone: string;
}

export interface CalendarResponse {
  lastUpdated: string;
  eventsCount: number;
  timezone: string;
  events: EconomicEvent[];
}

async function request<T>(path: string): Promise<T | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'X-API-Key': API_KEY },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function fetchTodayEvents(): Promise<CalendarResponse | null> {
  return request<CalendarResponse>('/announcements?impact=high,medium');
}

export function fetchWeekEvents(): Promise<CalendarResponse | null> {
  return request<CalendarResponse>('/announcements/week?impact=high,medium');
}

const CURRENCY_MAP: Record<string, string[]> = {
  'EUR/USD': ['EUR', 'USD'],
  'GBP/USD': ['GBP', 'USD'],
  'USD/JPY': ['USD', 'JPY'],
  'AUD/USD': ['AUD', 'USD'],
  'EUR/GBP': ['EUR', 'GBP'],
  'USD/CHF': ['USD', 'CHF'],
  'NZD/USD': ['NZD', 'USD'],
  'USD/CAD': ['USD', 'CAD'],
  'XAU/USD': ['USD', 'XAU'],
  'BTC/USD': ['USD'],
};

export function eventsForPair(events: EconomicEvent[], pair: string): EconomicEvent[] {
  const currencies = CURRENCY_MAP[pair] ?? [];
  return events.filter((e) => currencies.includes(e.currency));
}

export function eventsNearBoom(
  events: EconomicEvent[],
  boomTimeWAT: string,
  boomPairs: string[],
  windowMinutes = 60,
): EconomicEvent[] {
  const pairCurrencies = new Set<string>();
  for (const p of boomPairs) {
    for (const c of (CURRENCY_MAP[p] ?? [])) pairCurrencies.add(c);
  }

  const [bh, bm] = boomTimeWAT.split(':').map(Number);
  const boomMinutes = (bh ?? 0) * 60 + (bm ?? 0);

  return events.filter((e) => {
    if (!pairCurrencies.has(e.currency)) return false;
    const [eh, em] = e.time.replace(/[ap]m/i, '').trim().split(':').map(Number);
    let eventMinutes = (eh ?? 0) * 60 + (em ?? 0);
    if (/pm/i.test(e.time) && (eh ?? 0) < 12) eventMinutes += 720;
    if (/am/i.test(e.time) && (eh ?? 0) === 12) eventMinutes -= 720;
    const diff = Math.abs(eventMinutes - boomMinutes);
    return diff <= windowMinutes;
  });
}

export const IMPACT_COLORS: Record<ImpactLevel, string> = {
  high: '#FF453A',
  medium: '#FF9F0A',
  low: '#34C759',
  holiday: '#98989D',
};

export const IMPACT_ICONS: Record<ImpactLevel, string> = {
  high: 'alert-circle',
  medium: 'warning',
  low: 'information-circle',
  holiday: 'calendar',
};
