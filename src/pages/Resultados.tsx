import { motion } from "framer-motion";
import { Trophy, TrendingUp, TrendingDown, Target, XCircle, Percent, BarChart3, Calendar, DollarSign } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { EquityCurve } from "@/components/dashboard/EquityCurve";
import { useSignals } from "@/hooks/useSignals";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function useTradesHistory() {
  return useQuery({
    queryKey: ["trades-history-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trades_history")
        .select("*")
        .order("closed_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function computeMonthlyPerformance(trades: { profit_percent: number; result: string; closed_at: string }[]) {
  const byMonth: Record<string, { wins: number; losses: number; totalProfit: number }> = {};

  for (const t of trades) {
    const d = new Date(t.closed_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = { wins: 0, losses: 0, totalProfit: 0 };
    byMonth[key].totalProfit += t.profit_percent;
    if (t.result === "win") byMonth[key].wins++;
    else byMonth[key].losses++;
  }

  const months = Object.keys(byMonth).sort();
  return months.map((key) => {
    const m = byMonth[key];
    const total = m.wins + m.losses;
    const [, mm] = key.split("-");
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return {
      month: monthNames[parseInt(mm) - 1],
      roi: parseFloat(m.totalProfit.toFixed(1)),
      trades: total,
      winrate: total > 0 ? parseFloat(((m.wins / total) * 100).toFixed(1)) : 0,
    };
  });
}

function computeBankSimulation(trades: { profit_percent: number; closed_at: string }[]) {
  const startingBalance = 1000;
  const riskPercent = 0.02;
  let balance = startingBalance;
  const points = [{ label: "Início", value: startingBalance }];

  const byMonth: Record<string, number[]> = {};
  for (const t of trades) {
    const d = new Date(t.closed_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(t.profit_percent);
  }

  const months = Object.keys(byMonth).sort();
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  for (const key of months) {
    for (const pct of byMonth[key]) {
      const riskAmount = balance * riskPercent;
      balance += riskAmount * (pct / 100) * 50; // simplified leverage effect
    }
    const [, mm] = key.split("-");
    points.push({ label: monthNames[parseInt(mm) - 1], value: Math.round(balance) });
  }

  return points;
}

export default function Resultados() {
  const { data: allSignals, isLoading: signalsLoading } = useSignals();
  const { data: trades, isLoading: tradesLoading } = useTradesHistory();

  const isLoading = signalsLoading || tradesLoading;

  const wonSignals = allSignals?.filter(s => s.status === "tp").length ?? 0;
  const lostSignals = allSignals?.filter(s => s.status === "sl").length ?? 0;
  const totalClosed = wonSignals + lostSignals;
  const winRate = totalClosed > 0 ? ((wonSignals / totalClosed) * 100).toFixed(1) : "0.0";

  const monthlyData = trades ? computeMonthlyPerformance(trades) : [];
  const bankData = trades ? computeBankSimulation(trades) : [{ label: "Início", value: 1000 }];

  const avgMonthlyROI = monthlyData.length > 0
    ? (monthlyData.reduce((s, m) => s + m.roi, 0) / monthlyData.length).toFixed(1)
    : "0.0";

  const totalGrowth = bankData.length > 1
    ? (((bankData[bankData.length - 1].value - bankData[0].value) / bankData[0].value) * 100).toFixed(1)
    : "0.0";

  const stats = [
    { icon: Trophy, label: "Win Rate", value: `${winRate}%`, color: "text-primary" },
    { icon: Target, label: "Sinais Ganhos", value: wonSignals.toString(), color: "text-success" },
    { icon: XCircle, label: "Sinais Perdidos", value: lostSignals.toString(), color: "text-destructive" },
    { icon: DollarSign, label: "ROI Médio/Mês", value: `${avgMonthlyROI}%`, color: "text-primary" },
    { icon: BarChart3, label: "Total Sinais", value: (allSignals?.length ?? 0).toString(), color: "text-accent" },
    { icon: Calendar, label: "Meses Ativos", value: monthlyData.length.toString(), color: "text-warning" },
  ];

  return (
    <Layout>
      {/* Header */}
      <section className="pt-24 pb-8">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto">
            <Badge variant="default" className="mb-4 gap-1">
              <Trophy className="h-3 w-3" /> Resultados Reais
            </Badge>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Performance <span className="gradient-text">Comprovada</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Transparência total. Todos os dados vêm diretamente do banco de dados.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="pb-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 text-center"
              >
                <stat.icon className={`h-5 w-5 ${stat.color} mx-auto mb-2`} />
                {isLoading ? <Skeleton className="h-8 w-16 mx-auto mb-1" /> : (
                  <p className={`font-display text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Equity Curve */}
      <section className="pb-8">
        <div className="container mx-auto px-4">
          <EquityCurve />
        </div>
      </section>

      {/* Monthly ROI - Real Data */}
      <section className="pb-8">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-display font-bold">ROI Mensal</h3>
                <p className="text-xs text-muted-foreground">Performance real mês a mês • Dados do banco</p>
              </div>
            </div>
            <div className="h-64">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : monthlyData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Nenhum trade fechado ainda. Os dados aparecerão aqui automaticamente.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <XAxis dataKey="month" tick={{ fill: 'hsl(220 15% 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'hsl(220 15% 55%)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(230 25% 8%)', border: '1px solid hsl(230 20% 15%)', borderRadius: '12px', fontSize: '12px', color: 'hsl(210 40% 98%)' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'roi') return [`${value}%`, 'ROI'];
                        if (name === 'winrate') return [`${value}%`, 'Win Rate'];
                        return [value, name];
                      }}
                    />
                    <Bar dataKey="roi" radius={[6, 6, 0, 0]}>
                      {monthlyData.map((entry, i) => (
                        <Cell key={i} fill={entry.roi >= 0 ? 'hsl(160 84% 39%)' : 'hsl(0 72% 51%)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bank Simulation - Real Data */}
      <section className="pb-8">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h3 className="font-display font-bold">Simulação de Banca</h3>
                  <p className="text-xs text-muted-foreground">Começando com $1.000 • Risco 2% por trade • Dados reais</p>
                </div>
              </div>
              <div className="text-right">
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <p className={`font-display text-2xl font-bold ${Number(totalGrowth) >= 0 ? "gradient-text-gold" : "text-destructive"}`}>
                      {Number(totalGrowth) >= 0 ? "+" : ""}{totalGrowth}%
                    </p>
                    <p className="text-xs text-muted-foreground">crescimento total</p>
                  </>
                )}
              </div>
            </div>
            <div className="h-64">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : bankData.length <= 1 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Nenhum trade fechado ainda. A simulação será calculada automaticamente.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bankData}>
                    <defs>
                      <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(45 100% 60%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(45 100% 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fill: 'hsl(220 15% 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'hsl(220 15% 55%)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(230 25% 8%)', border: '1px solid hsl(230 20% 15%)', borderRadius: '12px', fontSize: '12px', color: 'hsl(210 40% 98%)' }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Banca']}
                    />
                    <Area type="monotone" dataKey="value" stroke="hsl(45 100% 60%)" strokeWidth={2} fill="url(#goldGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Signal History Table */}
      <section className="pb-24">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card overflow-hidden">
            <div className="p-6 border-b border-border/30">
              <h3 className="font-display font-bold">Histórico de Sinais Fechados</h3>
              <p className="text-xs text-muted-foreground">Últimos sinais com resultado</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Par</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Confiança</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Entrada</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Resultado</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {signalsLoading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">A carregar...</td></tr>
                  ) : (
                    allSignals?.filter(s => s.status === "tp" || s.status === "sl").slice(0, 20).map((signal, i) => (
                      <motion.tr
                        key={signal.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-border/20 hover:bg-secondary/20 transition-colors"
                      >
                        <td className="p-4 font-semibold text-sm">{signal.pair}</td>
                        <td className="p-4">
                          <span className={`flex items-center gap-1 text-sm ${signal.type === "BUY" ? "text-success" : "text-destructive"}`}>
                            {signal.type === "BUY" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {signal.type}
                          </span>
                        </td>
                        <td className="p-4 text-sm">{signal.confidence}%</td>
                        <td className="p-4 font-mono text-sm">{signal.entry < 100 ? signal.entry.toFixed(5) : signal.entry.toFixed(2)}</td>
                        <td className="p-4">
                          <Badge variant={signal.status === "tp" ? "success" : "destructive"} className="text-[10px]">
                            {signal.status === "tp" ? "✓ TP" : "✗ SL"}
                          </Badge>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">
                          {new Date(signal.createdAt).toLocaleDateString("pt-BR")}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
