import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Target, Shield, Percent, RefreshCw } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { TradingViewChart } from "@/components/signals/TradingViewChart";
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

function pipMultiplier(symbol: string): number {
  if (symbol.includes("JPY")) return 100;
  if (symbol.includes("XAU")) return 100;
  if (symbol.includes("BTC")) return 1;
  return 10000;
}

const tvIntervals: Record<string, string> = {
  "M15": "15", "H1": "60", "H4": "240",
};

export default function SignalDetail() {
  const { id } = useParams<{ id: string }>();
  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSignal = async () => {
      try {
        const { data, error } = await supabase
          .from("signals")
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        if (data) {
          setSignal({
            id: String(data.id),
            pair: formatSymbol(data.symbol),
            timeframe: formatTimeframe(data.timeframe),
            type: data.signal_type?.toUpperCase() as "BUY" | "SELL" | "AGUARDAR",
            confidence: Number(data.confidence) || 50,
            entry: Number(data.entry_price) || 0,
            stopLoss: Number(data.stop_loss) || 0,
            takeProfit: Number(data.target_price) || 0,
            reasons: data.reasons ?? [],
            createdAt: data.created_at ?? new Date().toISOString(),
            status: data.status as "active" | "tp" | "sl",
          });
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchSignal();
  }, [id]);

  const getSignalStyles = () => {
    if (!signal) return { bg: "", text: "", icon: Clock, glow: "" };
    switch (signal.type) {
      case "BUY": return { bg: "bg-success/10 border-success/30", text: "text-success", icon: TrendingUp, glow: "glow-success" };
      case "SELL": return { bg: "bg-destructive/10 border-destructive/30", text: "text-destructive", icon: TrendingDown, glow: "glow-danger" };
      default: return { bg: "bg-warning/10 border-warning/30", text: "text-warning", icon: Clock, glow: "" };
    }
  };

  const styles = getSignalStyles();
  const Icon = styles.icon;
  const riskReward = signal ? Math.abs(signal.takeProfit - signal.entry) / Math.abs(signal.entry - signal.stopLoss) : 0;
  const tvInterval = signal ? (tvIntervals[signal.timeframe] ?? "60") : "60";

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Link to="/analises" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="h-3 w-3" /> Voltar às Análises
            </Link>

            {loading ? (
              <div className="glass-card p-12 text-center">
                <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-muted-foreground">A carregar sinal...</p>
              </div>
            ) : error || !signal ? (
              <div className="glass-card p-12 text-center">
                <p className="text-destructive mb-2">Sinal não encontrado</p>
                <p className="text-sm text-muted-foreground">{error || "O sinal pode ter sido removido."}</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h1 className="font-display text-3xl font-bold">{signal.pair}</h1>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm text-muted-foreground">{signal.timeframe}</span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${signal.status === "tp" ? "bg-success/20 text-success" : signal.status === "sl" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}>
                        {signal.status === "tp" ? "✓ Take Profit" : signal.status === "sl" ? "✗ Stop Loss" : "Ativo"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(signal.createdAt).toLocaleString("pt-PT")}
                      </span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-5 py-3 rounded-xl border ${styles.bg} ${styles.glow}`}>
                    <Icon className={`h-6 w-6 ${styles.text}`} />
                    <span className={`font-bold text-lg ${styles.text}`}>{signal.type}</span>
                  </div>
                </div>

                {/* Chart */}
                <div className="mb-8" style={{ height: "480px", width: "100%", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <TradingViewChart symbol={signal.pair} interval={tvInterval} />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="glass-card p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                      <Percent className="h-3 w-3" /> Confiança
                    </p>
                    <p className={`font-display text-2xl font-bold ${signal.confidence >= 80 ? "text-success" : signal.confidence >= 60 ? "text-warning" : "text-muted-foreground"}`}>
                      {signal.confidence}%
                    </p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Risco/Retorno</p>
                    <p className={`font-display text-2xl font-bold ${riskReward >= 2 ? "text-success" : "text-warning"}`}>
                      1:{riskReward.toFixed(1)}
                    </p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                      <Shield className="h-3 w-3 text-destructive" /> Stop Loss
                    </p>
                    <p className="font-mono text-lg font-bold text-destructive">{signal.stopLoss.toFixed(5)}</p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                      <Target className="h-3 w-3 text-success" /> Take Profit
                    </p>
                    <p className="font-mono text-lg font-bold text-success">{signal.takeProfit.toFixed(5)}</p>
                  </div>
                </div>

                {/* Entry Price */}
                <div className="glass-card p-6 mb-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Preço de Entrada</p>
                      <p className="font-mono text-2xl font-bold">{signal.entry.toFixed(5)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Distância SL</p>
                      <p className="font-mono text-sm text-destructive">
                        {(Math.abs(signal.entry - signal.stopLoss) * pipMultiplier(signal.pair)).toFixed(1)} pips
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Distância TP</p>
                      <p className="font-mono text-sm text-success">
                        {(Math.abs(signal.takeProfit - signal.entry) * pipMultiplier(signal.pair)).toFixed(1)} pips
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reasons */}
                {signal.reasons.length > 0 && (
                  <div className="glass-card p-6">
                    <h2 className="font-display text-lg font-bold mb-4">Razões Técnicas</h2>
                    <ul className="space-y-3">
                      {signal.reasons.map((reason, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                            {i + 1}
                          </span>
                          <span className="text-foreground/80">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
