import { useEffect, useMemo, useState } from "react";
import type { BoomHour } from "@/lib/types";

const WAT_OFFSET_MS = 60 * 60 * 1000; // WAT = UTC+1

export function parseWatTime(t: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h <= 23 && min <= 59 ? { h, m: min } : null;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Contagem decrescente em tempo real até ao início da próxima sessão Boom.
 * Lógica de seleção idêntica à do useBoomHours: a primeira sessão cuja hora
 * ainda não passou, ou a primeira do dia seguinte se já passaram todas.
 * Devolve null quando não há sessões ativas.
 */
export function useBoomCountdown(booms: BoomHour[]) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    if (booms.length === 0) return null;

    const watDate = new Date(now + WAT_OFFSET_MS);
    const nowMin = watDate.getUTCHours() * 60 + watDate.getUTCMinutes();

    let target: BoomHour | null = null;
    for (const b of booms) {
      const t = parseWatTime(b.time_wat);
      if (t && t.h * 60 + t.m > nowMin) {
        target = b;
        break;
      }
    }
    const next = target ?? booms[0] ?? null;
    if (!next) return null;

    const t = parseWatTime(next.time_wat);
    if (!t) return null;

    // Início da sessão no dia WAT atual, convertido para UTC (WAT = UTC+1).
    const base = Date.UTC(
      watDate.getUTCFullYear(),
      watDate.getUTCMonth(),
      watDate.getUTCDate(),
      t.h - 1,
      t.m,
    );
    const start = base > now ? base : base + 24 * 60 * 60 * 1000;

    return { boom: next, ms: start - now, startsAt: start };
  }, [booms, now]);
}