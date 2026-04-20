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
    fetchHistory();
    
    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchHistory, 5 * 60 * 1000);
    
    // Realtime
    const channel = supabase
      .channel("signals-history")
      .on("postgres_changes", { 
        event: "UPDATE", 
        schema: "public", 
        table: "signals",
        filter: "status=in.(tp,sl)"
      }, () => {
        fetchHistory();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return { signals, stats, loading };
}
