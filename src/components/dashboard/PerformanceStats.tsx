import { motion } from "framer-motion";
import { TrendingUp, Target, BarChart3, Zap, DollarSign, Percent } from "lucide-react";
import { useSignals } from "@/hooks/useSignals";
import { Skeleton } from "@/components/ui/skeleton";

export function PerformanceStats() {
  const { data: allSignals, isLoading } = useSignals();

  const totalSignals = allSignals?.length ?? 0;
  const wonSignals = allSignals?.filter(s => s.status === "tp").length ?? 0;
  const lostSignals = allSignals?.filter(s => s.status === "sl").length ?? 0;
  const activeSignals = allSignals?.filter(s => s.status === "active").length ?? 0;
  const closedSignals = wonSignals + lostSignals;
  const winRate = closedSignals > 0 ? ((wonSignals / closedSignals) * 100).toFixed(1) : "0.0";
  
  // Simulated performance metrics based on signal data
  const avgConfidence = allSignals?.length 
    ? (allSignals.reduce((sum, s) => sum + s.confidence, 0) / allSignals.length).toFixed(0)
    : "0";

  const stats = [
    { 
      icon: DollarSign, 
      label: "Saldo Virtual", 
      value: "$12,847", 
      change: "+28.5%",
      positive: true,
      color: "text-primary" 
    },
    { 
      icon: Percent, 
      label: "ROI Total", 
      value: `${winRate}%`, 
      change: "Win Rate",
      positive: true,
      color: "text-primary" 
    },
    { 
      icon: Target, 
      label: "Sinais Ganhos", 
      value: `${wonSignals}/${closedSignals}`, 
      change: `${activeSignals} ativos`,
      positive: true,
      color: "text-success" 
    },
    { 
      icon: BarChart3, 
      label: "Confiança Média", 
      value: `${avgConfidence}%`, 
      change: "IA Analysis",
      positive: true,
      color: "text-accent" 
    },
    { 
      icon: Zap, 
      label: "Sinais Ativos", 
      value: activeSignals.toString(), 
      change: "Em tempo real",
      positive: true,
      color: "text-warning" 
    },
    { 
      icon: TrendingUp, 
      label: "Total Gerados", 
      value: totalSignals.toString(), 
      change: "Todos os sinais",
      positive: true,
      color: "text-foreground" 
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4 group hover:border-primary/20 transition-all"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-lg bg-secondary flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-16 mb-1" />
            ) : (
              <p className={`font-display text-xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">{stat.label}</p>
            <p className={`text-[10px] mt-0.5 ${stat.positive ? "text-success" : "text-destructive"}`}>
              {stat.change}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
