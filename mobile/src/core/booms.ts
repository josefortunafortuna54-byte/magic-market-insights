import type { BoomHour, BoomStatus } from './types';

const LIVE_WINDOW_MS = 15 * 60 * 1000;
export const BOOM_LIVE_WINDOW_MINUTES = 15;

export function getBoomStatus(boomTime: string): BoomStatus {
  const now = Date.now();
  const boom = new Date(boomTime).getTime();
  const diff = boom - now;
  if (diff > 0 && diff <= LIVE_WINDOW_MS) return 'live';
  if (diff > 0) return 'upcoming';
  return 'expired';
}

export function boomCountdown(boomTime: string): string {
  const diff = new Date(boomTime).getTime() - Date.now();
  if (diff <= 0) return '00:00:00';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function msUntil(boomTime: string): number {
  return new Date(boomTime).getTime() - Date.now();
}

export function boomEpochMs(now: Date, timeWat: string): number {
  const [h, m] = (timeWat || '00:00').split(':').map(Number);
  const wat = new Date(now.getTime() + (now.getTimezoneOffset() + 60) * 60000);
  return Date.UTC(wat.getFullYear(), wat.getMonth(), wat.getDate(), h || 0, m || 0) - 3600_000;
}

export function getNextBoomHour(hours: BoomHour[], now: Date): BoomHour | undefined {
  const future = hours
    .map((h) => ({ hour: h, epoch: boomEpochMs(now, h.time_wat) }))
    .filter((x) => x.epoch >= now.getTime())
    .sort((a, b) => a.epoch - b.epoch);
  if (future.length > 0) return future[0].hour;
  return [...hours].sort((a, b) => boomEpochMs(now, a.time_wat) - boomEpochMs(now, b.time_wat))[0];
}
