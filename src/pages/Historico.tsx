import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Clock, Target, Shield, BarChart3, Trophy, AlertTriangle, Coins } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { useHistory } from "@/hooks/useHistory";
import { mockSignals } from "@/data/mockSignals";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-PT", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });
}

function pipMultiplier(pair: string): number {
  if (pair.includes("JPY")) return 100;
  if (pair.includes("XAU")) return 100;
  if (pair.includes("BTC")) return 1;
  return 10000;
}

export default function Historico() {
  const { signals, stats, loading } = useHistory();

  // Fallback para mock se não houver dados reais
  const historicalSignals = signals.length > 0
    ? signals
    : mockSignals
        .filter(s => s.status === "tp" || s.status === "sl")
        .map(s => {
          const pp = pipMultiplier(s.pair);
          return {
            id: s.id,
            pair: s.pair,
            timeframe: s.timeframe,
            type: s.type,
            confidence: s.confidence,
            entry: s.entry,
            stopLoss: s.stopLoss,
            takeProfit: s.takeProfit,
            result: s.status as "tp" | "sl",
            date: s.createdAt,
            profitPips: s.status === "tp"
              ? Math.round(Math.abs(s.takeProfit - s.entry) * pp)
              : -Math.round(Math.abs(s.entry - s.stopLoss) * pp),
          };
        });

  const displayStats = signals.length > 0 ? stats : {
    total: historicalSignals.length,
    tp: historicalSignals.filter(s => s.result === "tp").length,
    sl: historicalSignals.filter(s => s.result === "sl").length,
    winRate: historicalSignals.length > 0
      ? Math.round((historicalSignals.filter(s => s.result === "tp").length / historicalSignals.length) * 100)
      : 0,
    totalPips: historicalSignals.reduce((sum, s) => sum + s.profitPips, 0),
  };

  return (
    <Layout>
      <section className="pt-8 pb-6">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">
              Histórico de Sinais
            </h1>
            <p className="text-muted-foreground text-sm">
              Desempenho real dos sinais fechados
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats cards */}
      <section className="pb-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: BarChart3, label: "Total de Sinais", value: displayStats.total, color: "text-primary", bg: "bg-primary/10" },
              { icon: Trophy, label: "Take Profit (TP)", value: displayStats.tp, color: "text-success", bg: "bg-success/10" },
              { icon: AlertTriangle, label: "Stop Loss (SL)", value: displayStats.sl, color: "text-destructive", bg: "bg-destructive/10" },
              { icon: Target, label: "Taxa de Acerto", value: `${displayStats.winRate}%`, color: displayStats.winRate >= 60 ? "text-success" : "text-warning", bg: displayStats.winRate >= 60 ? "bg-success/10" : "bg-warning/10" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-5"
              >
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className={`font-display text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Total pips */}
          {displayStats.totalPips !== 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-4 mt-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Coins className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total de Pips</p>
                <p className={`font-display text-xl font-bold ${displayStats.totalPips >= 0 ? "text-success" : "text-destructive"}`}>
                  {displayStats.totalPips >= 0 ? "+" : ""}{displayStats.totalPips} pips
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Tabela de histórico */}
      <section className="pb-24">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="glass-card p-8 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">A carregar histórico...</p>
            </div>
          ) : historicalSignals.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">Sem histórico ainda</h3>
              <p className="text-sm text-muted-foreground">
                Os sinais fechados (TP ou SL) aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-4 text-xs text-muted-foreground font-medium">Par</th>
                      <th className="text-left p-4 text-xs text-muted-foreground font-medium">TF</th>
                      <th className="text-left p-4 text-xs text-muted-foreground font-medium">Tipo</th>
                      <th className="text-left p-4 text-xs text-muted-foreground font-medium">Confiança</th>
                      <th className="text-left p-4 text-xs text-muted-foreground font-medium">Entrada</th>
                      <th className="text-left p-4 text-xs text-muted-foreground font-medium">SL</th>
                      <th className="text-left p-4 text-xs text-muted-foreground font-medium">TP</th>
                      <th className="text-left p-4 text-xs text-muted-foreground font-medium">Resultado</th>
                      <th className="text-left p-4 text-xs text-muted-foreground font-medium">Pips</th>
                      <th className="text-left p-4 text-xs text-muted-foreground font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicalSignals.map((signal, i) => (
                      <motion.tr
                        key={signal.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-border/30 hover:bg-secondary/20 transition-colors"
                      >
                        <td className="p-4 font-display font-semibold text-sm">{signal.pair}</td>
                        <td className="p-4">
                          <span className="text-xs bg-secondary/60 px-2 py-1 rounded-lg">{signal.timeframe}</span>
                        </td>
                        <td className="p-4">
                          <span className={`flex items-center gap-1 text-xs font-semibold w-fit px-2 py-1 rounded-lg ${
                            signal.type === "BUY" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                          }`}>
                            {signal.type === "BUY" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {signal.type}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${signal.confidence >= 80 ? "bg-success" : signal.confidence >= 60 ? "bg-warning" : "bg-muted"}`}
                                style={{ width: `${signal.confidence}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{signal.confidence}%</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-sm">{signal.entry.toFixed(5)}</td>
                        <td className="p-4 font-mono text-sm text-destructive">{signal.stopLoss.toFixed(5)}</td>
                        <td className="p-4 font-mono text-sm text-success">{signal.takeProfit.toFixed(5)}</td>
                        <td className="p-4">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                            signal.result === "tp" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                          }`}>
                            {signal.result === "tp" ? "✓ TP" : "✗ SL"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`font-mono text-sm font-semibold ${signal.profitPips >= 0 ? "text-success" : "text-destructive"}`}>
                            {signal.profitPips >= 0 ? "+" : ""}{signal.profitPips}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">{formatDate(signal.date)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
