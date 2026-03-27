import { useState, useEffect } from "react";
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

export function useHistory() {
  const [signals, setSignals] = useState<HistorySignal[]>([]);
  const [stats, setStats] = useState<HistoryStats>({ total: 0, tp: 0, sl: 0, winRate: 0, totalPips: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Buscar sinais fechados (tp ou sl)
        const { data, error } = await supabase
          .from("signals")
          .select("*")
          .in("status", ["tp", "sl"])
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;

        const mapped: HistorySignal[] = (data || []).map((row: any) => {
          const entry = Number(row.entry_price) || 0;
          const tp = Number(row.target_price) || 0;
          const sl = Number(row.stop_loss) || 0;
          const isJPY = row.symbol?.includes("JPY");
          const pipMultiplier = isJPY ? 100 : 10000;

          const profitPips = row.status === "tp"
            ? Math.abs(tp - entry) * pipMultiplier
            : -Math.abs(entry - sl) * pipMultiplier;

          return {
            id: String(row.id),
            pair: formatSymbol(row.symbol),
            timeframe: row.timeframe ?? "H1",
            type: row.signal_type?.toUpperCase() as "BUY" | "SELL" | "AGUARDAR",
            confidence: Number(row.confidence) || 50,
            entry,
            stopLoss: sl,
            takeProfit: tp,
            result: row.status as "tp" | "sl",
            date: row.created_at ?? new Date().toISOString(),
            profitPips: Math.round(profitPips * 10) / 10,
          };
        });

        const tpCount = mapped.filter(s => s.result === "tp").length;
        const slCount = mapped.filter(s => s.result === "sl").length;
        const totalPips = mapped.reduce((sum, s) => sum + s.profitPips, 0);

        setSignals(mapped);
        setStats({
          total: mapped.length,
          tp: tpCount,
          sl: slCount,
          winRate: mapped.length > 0 ? Math.round((tpCount / mapped.length) * 100) : 0,
          totalPips: Math.round(totalPips * 10) / 10,
        });
      } catch (err: any) {
        console.error("Erro histórico:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return { signals, stats, loading };
}
