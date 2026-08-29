import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Target, Shield, Percent, RefreshCw, BarChart3, Zap, Activity, AlertTriangle } from "lucide-react";
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
      case "BUY": return { bg: "bg-success/10 border-success/30", text: "text-success", icon: TrendingUp, glow: "shadow-[0_0_20px_rgba(34,197,94,0.15)]" };
      case "SELL": return { bg: "bg-destructive/10 border-destructive/30", text: "text-destructive", icon: TrendingDown, glow: "shadow-[0_0_20px_rgba(239,68,68,0.15)]" };
      default: return { bg: "bg-warning/10 border-warning/30", text: "text-warning", icon: Clock, glow: "" };
    }
  };

  const styles = getSignalStyles();
  const Icon = styles.icon;
  const pp = pipMultiplier(signal?.pair || "");
  const riskReward = signal ? Math.abs(signal.takeProfit - signal.entry) / Math.abs(signal.entry - signal.stopLoss) : 0;
  const tvInterval = signal ? (tvIntervals[signal.timeframe] ?? "60") : "60";
  const slPips = signal ? Math.abs(signal.entry - signal.stopLoss) * pp : 0;
  const tpPips = signal ? Math.abs(signal.takeProfit - signal.entry) * pp : 0;
  const elapsed = signal ? Math.round((Date.now() - new Date(signal.createdAt).getTime()) / 3600000) : 0;

  return (
    <Layout>
      <section className="py-8 pb-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Link to="/analises" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
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
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="font-display text-3xl font-bold">{signal.pair}</h1>
                      <span className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold ${styles.bg} ${styles.glow} ${styles.text}`}>
                        <Icon className="h-5 w-5" />
                        {signal.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-muted-foreground bg-secondary/50 px-2 py-1 rounded">{signal.timeframe}</span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${signal.status === "tp" ? "bg-success/20 text-success" : signal.status === "sl" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}>
                        {signal.status === "tp" ? "✓ Take Profit" : signal.status === "sl" ? "✗ Stop Loss" : "● Ativo"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(signal.createdAt).toLocaleString("pt-PT")} · há {elapsed}h
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Confiança</p>
                      <p className={`font-display text-3xl font-bold ${signal.confidence >= 80 ? "text-success" : signal.confidence >= 60 ? "text-warning" : "text-muted-foreground"}`}>
                        {signal.confidence}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="glass-card p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                      <Shield className="h-3 w-3 text-destructive" /> Stop Loss
                    </p>
                    <p className="font-mono text-lg font-bold text-destructive">{signal.stopLoss.toFixed(5)}</p>
                    <p className="text-xs text-destructive/70 mt-1">{slPips.toFixed(1)} pips</p>
                  </div>
                  <div className="glass-card p-4 text-center border-primary/20 bg-primary/5">
                    <p className="text-xs text-primary mb-1 flex items-center justify-center gap-1">
                      <BarChart3 className="h-3 w-3" /> Entrada
                    </p>
                    <p className="font-mono text-lg font-bold text-foreground">{signal.entry.toFixed(5)}</p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                      <Target className="h-3 w-3 text-success" /> Take Profit
                    </p>
                    <p className="font-mono text-lg font-bold text-success">{signal.takeProfit.toFixed(5)}</p>
                    <p className="text-xs text-success/70 mt-1">{tpPips.toFixed(1)} pips</p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                      <Zap className="h-3 w-3" /> Risco/Retorno
                    </p>
                    <p className={`font-display text-2xl font-bold ${riskReward >= 2 ? "text-success" : riskReward >= 1.5 ? "text-warning" : "text-destructive"}`}>
                      1:{riskReward.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {riskReward >= 2 ? "Excelente" : riskReward >= 1.5 ? "Bom" : "Baixo"}
                    </p>
                  </div>
                </div>

                {/* Chart */}
                <div className="mb-6" style={{ height: "480px", width: "100%" }}>
                  <TradingViewChart symbol={signal.pair} interval={tvInterval} height="100%" />
                </div>
                <p className="text-xs text-muted-foreground mb-6">
                  Gráfico TradingView · {signal.timeframe} · Indicadores: EMA, RSI, MACD, Bollinger, Estocástico
                </p>

                {/* Análise Técnica */}
                {signal.reasons.length > 0 && (
                  <div className="glass-card p-6 mb-6">
                    <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      Análise Técnica
                    </h2>
                    <div className="space-y-3">
                      {signal.reasons.map((reason, i) => {
                        const isBearish = reason.toLowerCase().includes("bearish") || reason.toLowerCase().includes("sobrecompra") || reason.toLowerCase().includes("abaixo");
                        const isBullish = reason.toLowerCase().includes("bullish") || reason.toLowerCase().includes("sobrevenda") || reason.toLowerCase().includes("acima");
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30"
                          >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                              isBullish ? "bg-success/20 text-success" : isBearish ? "bg-destructive/20 text-destructive" : "bg-primary/10 text-primary"
                            }`}>
                              {i + 1}
                            </span>
                            <span className="text-sm text-foreground/80">{reason}</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="glass-card p-4 border-warning/20 bg-warning/5 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-warning mb-1">Aviso Importante</p>
                    <p className="text-xs text-muted-foreground">
                      Estes sinais são apenas para fins educacionais. Não constituem aconselhamento financeiro.
                      O trading envolve risco significativo de perda de capital. Não invistas mais do que podes perder.
                    </p>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
