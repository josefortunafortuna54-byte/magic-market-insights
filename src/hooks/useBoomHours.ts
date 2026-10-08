import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { BoomHour } from "@/lib/types";

interface BoomHourRow {
  id: string;
  title: string;
  time_gmt: string;
  time_wat: string;
  pairs: string[];
  days: string;
  description: string;
  volatility: number;
  badge: string;
  is_active: boolean;
  created_at: string;
}

async function fetchBoomHours(): Promise<BoomHour[]> {
  const { data, error } = await supabase
    .from("boom_hours")
    .select("*")
    .eq("is_active", true)
    .order("time_wat", { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => {
    const r = row as BoomHourRow;
    return {
      id: String(r.id),
      title: r.title ?? "",
      time_gmt: r.time_gmt ?? "",
      time_wat: r.time_wat ?? "",
      pairs: Array.isArray(r.pairs) ? r.pairs : [],
      days: r.days ?? "",
      description: r.description ?? "",
      volatility: Number(r.volatility) || 1,
      badge: r.badge ?? "",
      is_active: r.is_active !== false,
      created_at: r.created_at ?? new Date().toISOString(),
    };
  });
}

function toMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h <= 23 && min <= 59 ? h * 60 + min : null;
}

// WAT = UTC+1. A hora de referência das janelas e sempre a WAT local.
function watNowMinutes(): number {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

export function useBoomHours() {
  const queryClient = useQueryClient();

  const { data = [], isLoading: loading, refetch } = useQuery<BoomHour[], Error>({
    queryKey: ["boom-hours"],
    queryFn: fetchBoomHours,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  // Divisão intencional do data[0]: a próxima é a primeira cuja hora não
  // passou (ou a primeira de amanhã, se já passaram todas). O fetch traz
  // todas as sessões do dia de propósito: limitar a 10 faria o `data[0]`
  // (00:30) aparecer como "próximo" logo depois do meio da manhã.
  const nextBoom = useMemo<BoomHour | null>(() => {
    const now = watNowMinutes();
    return (
      data.find((b) => {
        const t = toMinutes(b.time_wat);
        return t !== null && t > now;
      }) ?? data[0] ?? null
    );
  }, [data]);

  useEffect(() => {
    const channel = supabase
      .channel("boom-hours-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "boom_hours" }, () => {
        queryClient.invalidateQueries({ queryKey: ["boom-hours"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return {
    nextBoom,
    booms: data,
    loading,
    refetch,
  };
}
