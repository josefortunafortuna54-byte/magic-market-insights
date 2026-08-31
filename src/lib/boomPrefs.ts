import type { BoomHour } from '@/lib/types';

export type VolTier = 'todas' | 'alta' | 'media' | 'baixa';

export interface BoomPrefs {
  pairs: string[];
  volTier: VolTier;
  hiddenIds: string[];
}

export const DEFAULT_BOOM_PREFS: BoomPrefs = { pairs: [], volTier: 'todas', hiddenIds: [] };

export const VOL_TIERS: { key: VolTier }[] = [
  { key: 'todas' },
  { key: 'alta' },
  { key: 'media' },
  { key: 'baixa' },
];

const VOL_RANGE: Record<VolTier, [number, number]> = {
  todas: [1, 5],
  alta: [4, 5],
  media: [2, 3],
  baixa: [1, 2],
};

function keyFor(userId?: string): string {
  return `boom_prefs_${userId ?? 'guest'}`;
}

export async function loadBoomPrefs(userId?: string): Promise<BoomPrefs> {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return DEFAULT_BOOM_PREFS;
    const p = JSON.parse(raw) as Partial<BoomPrefs>;
    return {
      pairs: Array.isArray(p.pairs) ? p.pairs : [],
      volTier: p.volTier && VOL_RANGE[p.volTier] ? p.volTier : 'todas',
      hiddenIds: Array.isArray(p.hiddenIds) ? p.hiddenIds : [],
    };
  } catch {
    return DEFAULT_BOOM_PREFS;
  }
}

export async function saveBoomPrefs(prefs: BoomPrefs, userId?: string): Promise<void> {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(prefs));
  } catch {
    return;
  }
}

export function applyBoomPrefs(hours: BoomHour[], prefs: BoomPrefs): BoomHour[] {
  if (!hours) return [];
  const [min, max] = VOL_RANGE[prefs.volTier] ?? VOL_RANGE.todas;
  const inTier = (h: BoomHour) => {
    const vol = Number(h.volatility) || 1;
    return vol >= min && vol <= max;
  };
  return hours
    .filter((h) => {
      if (prefs.hiddenIds.includes(h.id)) return false;
      if (prefs.pairs.length > 0 && !(h.pairs || []).some((p) => prefs.pairs.includes(p))) return false;
      return true;
    })
    .sort((a, b) => {
      const ta = inTier(a) ? 0 : 1;
      const tb = inTier(b) ? 0 : 1;
      if (ta !== tb) return ta - tb;
      return (Number(b.volatility) || 1) - (Number(a.volatility) || 1);
    });
}

export function hasActiveFilters(prefs: BoomPrefs): boolean {
  return prefs.pairs.length > 0 || prefs.hiddenIds.length > 0;
}

export function collectBoomPairs(hours: BoomHour[]): string[] {
  const set = new Set<string>();
  hours.forEach((h) => (h.pairs || []).forEach((p) => set.add(p)));
  return Array.from(set).sort();
}