import { motion } from "framer-motion";
import { History, TrendingUp, TrendingDown, Target, XCircle } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { historicalSignals } from "@/data/mockSignals";

export default function Historico() {
  const tpSignals = historicalSignals.filter((s) => s.status === "tp");
  const slSignals = historicalSignals.filter((s) => s.status === "sl");
  const winRate = ((tpSignals.length / historicalSignals.length) * 100).toFixed(1);

  const stats = [
    {
      label: "Total de Sinais",
      value: historicalSignals.length,
      icon: History,
      color: "text-primary",
    },
    {
      label: "Take Profit (TP)",
      value: tpSignals.length,
      icon: Target,
      color: "text-success",
    },
    {
      label: "Stop Loss (SL)",
      value: slSignals.length,
      icon: XCircle,
      color: "text-destructive",
    },
    {
      label: "Taxa de Acerto",
      value: `${winRate}%`,
      icon: TrendingUp,
      color: "text-success",
    },
  ];

  return (
    <Layout>
      {/* Header */}
      <section className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Histórico de Sinais
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Acompanhe o desempenho dos sinais passados e nossa taxa de acerto.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="pb-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
                <p className={`font-display text-3xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Historical Signals Table */}
      <section className="pb-24">
        <div className="container mx-auto px-4">
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Par</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">TF</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Confiança</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Entrada</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">SL</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">TP</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Resultado</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {historicalSignals.map((signal, i) => (
                    <motion.tr
                      key={signal.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="p-4">
                        <span className="font-semibold">{signal.pair}</span>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-xs">
                          {signal.timeframe}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {signal.type === "BUY" ? (
                            <TrendingUp className="h-4 w-4 text-success" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-destructive" />
                          )}
                          <span className={signal.type === "BUY" ? "text-success" : "text-destructive"}>
                            {signal.type}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                signal.confidence >= 80 ? "bg-success" : signal.confidence >= 60 ? "bg-warning" : "bg-muted"
                              }`}
                              style={{ width: `${signal.confidence}%` }}
                            />
                          </div>
                          <span className="text-sm">{signal.confidence}%</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-sm">{signal.entry.toFixed(5)}</td>
                      <td className="p-4 font-mono text-sm text-destructive">{signal.stopLoss.toFixed(5)}</td>
                      <td className="p-4 font-mono text-sm text-success">{signal.takeProfit.toFixed(5)}</td>
                      <td className="p-4">
                        <Badge variant={signal.status === "tp" ? "success" : "destructive"}>
                          {signal.status === "tp" ? "✓ TP" : "✗ SL"}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(signal.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
