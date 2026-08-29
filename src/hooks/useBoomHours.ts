import { useEffect } from "react";
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
    .order("time_wat", { ascending: true })
    .limit(10);

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

export function useBoomHours() {
  const queryClient = useQueryClient();

  const { data = [], isLoading: loading, refetch } = useQuery<BoomHour[], Error>({
    queryKey: ["boom-hours"],
    queryFn: fetchBoomHours,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

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
    nextBoom: data[0] ?? null,
    booms: data,
    loading,
    refetch,
  };
}
