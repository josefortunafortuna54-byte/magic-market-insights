import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { Signal } from "@/lib/types";
import { formatSymbol, formatTimeframe, formatType } from "@/lib/format";

interface SignalRow {
  id: string;
  symbol: string;
  timeframe: string;
  signal_type: string;
  confidence: number;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  reasons: string[];
  created_at: string;
  status: string;
  tier: string | null;
  risk_reward: number | null;
  expires_at: string | null;
  analysis: string | null;
  probability_score: number | null;
  smc_setup: string | null;
}

function determineStatus(row: SignalRow): "active" | "pending" | "tp" | "sl" {
  if (row.status === "tp") return "tp";
  if (row.status === "sl") return "sl";
  if (row.status === "active") return "active";
  if (row.status === "pending") return "pending";
  return Number(row.confidence) >= 70 ? "active" : "pending";
}

async function fetchSignals(): Promise<Signal[]> {
  const { data, error } = await supabase
    .from("signals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data || []).map((row: SignalRow) => ({
    id: String(row.id),
    pair: formatSymbol(row.symbol),
    timeframe: formatTimeframe(row.timeframe),
    type: formatType(row.signal_type),
    confidence: Number(row.confidence) || 50,
    entry: Number(row.entry_price) || 0,
    stopLoss: Number(row.stop_loss) || 0,
    takeProfit: Number(row.target_price) || 0,
    reasons: row.reasons ?? [],
    createdAt: row.created_at ?? new Date().toISOString(),
    status: determineStatus(row),
    // Novos campos do modelo Pro/SMC
    tier: (row.tier as Signal["tier"]) ?? "free",
    riskReward: row.risk_reward != null ? Number(row.risk_reward) : undefined,
    expiresAt: row.expires_at ?? undefined,
    analysis: row.analysis ?? undefined,
    probabilityScore: row.probability_score != null ? Number(row.probability_score) : undefined,
    smcSetup: row.smc_setup ?? undefined,
  }));
}

export function useSignals() {
  const queryClient = useQueryClient();

  const { data: signals = [], isLoading: loading, error: queryError, refetch } = useQuery<Signal[], Error>({
    queryKey: ["signals"],
    queryFn: fetchSignals,
    staleTime: 30_000,
    refetchInterval: false,
  });

  useEffect(() => {
    const channel = supabase
      .channel("signals-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "signals" }, () => {
        queryClient.invalidateQueries({ queryKey: ["signals"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return { signals, loading, error: queryError?.message || null, refetch };
}
