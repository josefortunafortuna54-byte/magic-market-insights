import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Signal } from "@/components/signals/SignalCard";

function formatSymbol(symbol: string): string {
  if (!symbol) return "N/A";
  if (symbol.includes("/")) return symbol;
  if (symbol.length === 6) return symbol.slice(0, 3) + "/" + symbol.slice(3);
  return symbol;
}

function formatTimeframe(tf: string): string {
  if (!tf) return "H1";
  const map: Record<string, string> = {
    "1m": "M1", "5m": "M5", "15m": "M15", "30m": "M30",
    "1h": "H1", "4h": "H4", "1d": "D1",
    "M1": "M1", "M5": "M5", "M15": "M15", "M30": "M30",
    "H1": "H1", "H4": "H4", "D1": "D1",
  };
  return map[tf] ?? tf.toUpperCase();
}

function formatType(type: string): "BUY" | "SELL" | "AGUARDAR" {
  if (!type) return "AGUARDAR";
  const upper = type.toUpperCase();
  if (upper === "BUY") return "BUY";
  if (upper === "SELL") return "SELL";
  return "AGUARDAR";
}

// Determina se o sinal está "Ativo" (na zona) ou "A aguardar" (longe da entrada)
function determineStatus(row: any): "active" | "pending" | "tp" | "sl" {
  if (row.status === "tp") return "tp";
  if (row.status === "sl") return "sl";

  const entry = Number(row.entry_price);
  const stopLoss = Number(row.stop_loss);
  const takeProfit = Number(row.target_price);
  const signalType = row.signal_type?.toUpperCase();

  if (!entry || !stopLoss || !takeProfit) return "pending";

  // Calcula a distância de pip entre entrada e stop
  const pipDistance = Math.abs(entry - stopLoss);
  // Zona de tolerância: 30% da distância de pip
  const tolerance = pipDistance * 0.3;

  // Se o preço atual (entry_price como proxy) está dentro da zona de entrada
  // considera ativo, caso contrário pendente
  // Como não temos preço atual em tempo real aqui, usamos a confiança como proxy:
  // Confiança >= 70 = na zona (ativo), < 70 = fora da zona (a aguardar)
  if (row.status === "active") return "active";
  if (row.status === "pending") return "pending";

  return Number(row.confidence) >= 70 ? "active" : "pending";
}

export function useSignals() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSignals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("signals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const mapped: Signal[] = (data || []).map((row: any) => ({
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
      }));

      setSignals(mapped);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error("Erro Supabase:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    const channel = supabase
      .channel("signals-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "signals" }, () => {
        fetchSignals();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return { signals, loading, error, refetch: fetchSignals };
}
