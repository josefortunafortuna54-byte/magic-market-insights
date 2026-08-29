import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export interface HistorySignal {
  id: string;
  pair: string;
  timeframe: string;
  type: "BUY" | "SELL" | "AGUARDAR";
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  result: "tp" | "sl";
  date: string;
  profitPips: number;
}

export interface HistoryStats {
  total: number;
  tp: number;
  sl: number;
  winRate: number;
  totalPips: number;
}

function formatSymbol(symbol: string): string {
  if (!symbol) return "N/A";
  if (symbol.includes("/")) return symbol;
  if (symbol.length === 6) return symbol.slice(0, 3) + "/" + symbol.slice(3);
  return symbol;
}

function calcPips(entry: number, tp: number, sl: number, status: string, symbol: string): number {
  const isJPY = symbol?.includes("JPY");
  const isGold = symbol?.includes("XAU");
  const isBtc = symbol?.includes("BTC");

  let pipMultiplier: number;
  if (isJPY) pipMultiplier = 100;
  else if (isGold) pipMultiplier = 100;
  else if (isBtc) pipMultiplier = 1;
  else pipMultiplier = 10000;

  return status === "tp"
    ? Math.abs(tp - entry) * pipMultiplier
    : -Math.abs(entry - sl) * pipMultiplier;
}

interface HistoryResult {
  signals: HistorySignal[];
  stats: HistoryStats;
}

async function fetchHistory(): Promise<HistoryResult> {
  const { data, error } = await supabase
    .from("signals")
    .select("*")
    .in("status", ["tp", "sl"])
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const mapped: HistorySignal[] = (data || []).map((row: any) => {
    const entry = Number(row.entry_price) || 0;
    const tp = Number(row.target_price) || 0;
    const sl = Number(row.stop_loss) || 0;
    const symbol = row.symbol || "";
    const profitPips = calcPips(entry, tp, sl, row.status, symbol);

    return {
      id: String(row.id),
      pair: formatSymbol(symbol),
      timeframe: row.timeframe ?? "H1",
      type: row.signal_type?.toUpperCase() as "BUY" | "SELL" | "AGUARDAR",
      confidence: Number(row.confidence) || 50,
      entry, stopLoss: sl, takeProfit: tp,
      result: row.status as "tp" | "sl",
      date: row.created_at ?? new Date().toISOString(),
      profitPips: Math.round(profitPips * 10) / 10,
    };
  });

  const tpCount = mapped.filter(s => s.result === "tp").length;
  const slCount = mapped.filter(s => s.result === "sl").length;
  const totalPips = mapped.reduce((sum, s) => sum + s.profitPips, 0);

  return {
    signals: mapped,
    stats: {
      total: mapped.length,
      tp: tpCount,
      sl: slCount,
      winRate: mapped.length > 0 ? Math.round((tpCount / mapped.length) * 100) : 0,
      totalPips: Math.round(totalPips * 10) / 10,
    },
  };
}

export function useHistory() {
  const queryClient = useQueryClient();

  const { data, isLoading: loading } = useQuery<HistoryResult, Error>({
    queryKey: ["history"],
    queryFn: fetchHistory,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("signals-history-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "signals" },
        (payload) => {
          const newStatus = payload.new?.status;
          const oldStatus = payload.old?.status;
          if (newStatus === "tp" || newStatus === "sl" || oldStatus === "tp" || oldStatus === "sl") {
            queryClient.invalidateQueries({ queryKey: ["history"] });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return {
    signals: data?.signals ?? [],
    stats: data?.stats ?? { total: 0, tp: 0, sl: 0, winRate: 0, totalPips: 0 },
    loading,
  };
}
