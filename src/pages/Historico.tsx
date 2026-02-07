import { motion } from "framer-motion";
import { History, TrendingUp, TrendingDown, Target, XCircle, Loader2, BarChart3 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSignals } from "@/hooks/useSignals";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Historico() {
  // Fetch closed signals (tp or sl)
  const { data: allSignals, isLoading: signalsLoading } = useSignals();
  
  // Fetch trades history for profit data
  const { data: tradesHistory } = useQuery({
    queryKey: ["trades-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trades_history")
        .select("*")
        .order("closed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const closedSignals = (allSignals || []).filter(
    (s) => s.status === "tp" || s.status === "sl"
  );
  const tpSignals = closedSignals.filter((s) => s.status === "tp");
  const slSignals = closedSignals.filter((s) => s.status === "sl");
  const winRate = closedSignals.length > 0
    ? ((tpSignals.length / closedSignals.length) * 100).toFixed(1)
    : "0.0";

  const totalProfit = tradesHistory?.reduce((sum, t) => sum + Number(t.profit_percent), 0) ?? 0;

  const stats = [
    { label: "Total de Sinais", value: closedSignals.length, icon: History, color: "text-primary" },
    { label: "Take Profit (TP)", value: tpSignals.length, icon: Target, color: "text-success" },
    { label: "Stop Loss (SL)", value: slSignals.length, icon: XCircle, color: "text-destructive" },
    { label: "Taxa de Acerto", value: `${winRate}%`, icon: TrendingUp, color: "text-success" },
  ];

  return (
    <Layout>
      <section className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4">Histórico de Sinais</h1>
            <p className="text-muted-foreground max-w-2xl">
              Acompanhe o desempenho dos sinais passados e nossa taxa de acerto.
            </p>
          </motion.div>
        </div>
      </section>

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
                <p className={`font-display text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="container mx-auto px-4">
          {signalsLoading ? (
            <div className="glass-card p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : closedSignals.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">Sem sinais fechados</h3>
              <p className="text-sm text-muted-foreground">
                O histórico aparecerá quando sinais forem fechados com TP ou SL.
              </p>
            </div>
          ) : (
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
                    {closedSignals.map((signal, i) => {
                      const formatPrice = (p: number) => p < 100 ? p.toFixed(5) : p.toFixed(2);
                      return (
                        <motion.tr
                          key={signal.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
                        >
                          <td className="p-4 font-semibold">{signal.pair}</td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-xs">{signal.timeframe}</Badge>
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
                          <td className="p-4 font-mono text-sm">{formatPrice(signal.entry)}</td>
                          <td className="p-4 font-mono text-sm text-destructive">{formatPrice(signal.stopLoss)}</td>
                          <td className="p-4 font-mono text-sm text-success">{formatPrice(signal.takeProfit)}</td>
                          <td className="p-4">
                            <Badge variant={signal.status === "tp" ? "success" : "destructive"}>
                              {signal.status === "tp" ? "✓ TP" : "✗ SL"}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {new Date(signal.createdAt).toLocaleDateString("pt-BR")}
                          </td>
                        </motion.tr>
                      );
                    })}
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
