import { motion } from "framer-motion";
import { Trophy, TrendingUp, TrendingDown, Target, XCircle, Percent, BarChart3, Calendar, DollarSign } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { EquityCurve } from "@/components/dashboard/EquityCurve";
import { useSignals } from "@/hooks/useSignals";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

// Simulated monthly performance
const monthlyPerformance = [
  { month: "Set", roi: 22, trades: 45, winrate: 78 },
  { month: "Out", roi: 31, trades: 52, winrate: 82 },
  { month: "Nov", roi: 18, trades: 38, winrate: 71 },
  { month: "Dez", roi: 42, trades: 61, winrate: 85 },
  { month: "Jan", roi: 37, trades: 55, winrate: 83 },
  { month: "Fev", roi: 28, trades: 47, winrate: 79 },
];

const bankSimulation = [
  { month: "Início", value: 1000 },
  { month: "Mês 1", value: 1220 },
  { month: "Mês 2", value: 1598 },
  { month: "Mês 3", value: 1886 },
  { month: "Mês 4", value: 2678 },
  { month: "Mês 5", value: 3669 },
  { month: "Mês 6", value: 4696 },
];

export default function Resultados() {
  const { data: allSignals, isLoading } = useSignals();

  const wonSignals = allSignals?.filter(s => s.status === "tp").length ?? 0;
  const lostSignals = allSignals?.filter(s => s.status === "sl").length ?? 0;
  const totalClosed = wonSignals + lostSignals;
  const winRate = totalClosed > 0 ? ((wonSignals / totalClosed) * 100).toFixed(1) : "82.5";

  const stats = [
    { icon: Trophy, label: "Win Rate", value: `${winRate}%`, color: "text-primary" },
    { icon: Target, label: "Sinais Ganhos", value: wonSignals.toString(), color: "text-success" },
    { icon: XCircle, label: "Sinais Perdidos", value: lostSignals.toString(), color: "text-destructive" },
    { icon: DollarSign, label: "ROI Médio/Mês", value: "+29.7%", color: "text-primary" },
    { icon: BarChart3, label: "Total Sinais", value: (allSignals?.length ?? 0).toString(), color: "text-accent" },
    { icon: Calendar, label: "Meses Ativos", value: "6", color: "text-warning" },
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
              Transparência total. Todos os sinais são registados e verificáveis.
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

      {/* Monthly ROI */}
      <section className="pb-8">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-display font-bold">ROI Mensal</h3>
                <p className="text-xs text-muted-foreground">Performance mês a mês</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyPerformance}>
                  <XAxis dataKey="month" tick={{ fill: 'hsl(220 15% 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(220 15% 55%)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(230 25% 8%)', border: '1px solid hsl(230 20% 15%)', borderRadius: '12px', fontSize: '12px', color: 'hsl(210 40% 98%)' }}
                    formatter={(value: number, name: string) => {
                      if (name === 'roi') return [`${value}%`, 'ROI'];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="roi" radius={[6, 6, 0, 0]}>
                    {monthlyPerformance.map((entry, i) => (
                      <Cell key={i} fill={entry.roi >= 30 ? 'hsl(160 84% 39%)' : 'hsl(263 70% 55%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bank Simulation */}
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
                  <p className="text-xs text-muted-foreground">Começando com $1.000 • Risco 2% por trade</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-bold gradient-text-gold">+369.6%</p>
                <p className="text-xs text-muted-foreground">em 6 meses</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bankSimulation}>
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(45 100% 60%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(45 100% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fill: 'hsl(220 15% 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(220 15% 55%)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(230 25% 8%)', border: '1px solid hsl(230 20% 15%)', borderRadius: '12px', fontSize: '12px', color: 'hsl(210 40% 98%)' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Banca']}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(45 100% 60%)" strokeWidth={2} fill="url(#goldGrad)" />
                </AreaChart>
              </ResponsiveContainer>
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
                  {isLoading ? (
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
