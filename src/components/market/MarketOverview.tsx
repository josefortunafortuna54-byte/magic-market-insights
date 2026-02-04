import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, Zap, BarChart3 } from "lucide-react";
import { useMarketPrices } from "@/hooks/useMarketPrices";
import { useSignals } from "@/hooks/useSignals";
import { Skeleton } from "@/components/ui/skeleton";

export function MarketOverview() {
  const { data: prices, isLoading: pricesLoading } = useMarketPrices();
  const { data: signals, isLoading: signalsLoading } = useSignals("active");

  const gainers = prices?.filter((p) => (p.change_percent ?? 0) > 0).length ?? 0;
  const losers = prices?.filter((p) => (p.change_percent ?? 0) < 0).length ?? 0;
  const activeSignals = signals?.length ?? 0;

  const stats = [
    {
      icon: TrendingUp,
      label: "Em Alta",
      value: gainers,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      icon: TrendingDown,
      label: "Em Baixa",
      value: losers,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      icon: Activity,
      label: "Pares Ativos",
      value: prices?.length ?? 0,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: Zap,
      label: "Sinais Ativos",
      value: activeSignals,
      color: "text-warning",
      bg: "bg-warning/10",
    },
  ];

  const isLoading = pricesLoading || signalsLoading;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="font-display font-bold">Visão Geral do Mercado</h3>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`${stat.bg} rounded-xl p-4 text-center`}
          >
            <stat.icon className={`h-6 w-6 ${stat.color} mx-auto mb-2`} />
            {isLoading ? (
              <Skeleton className="h-8 w-12 mx-auto mb-1" />
            ) : (
              <p className={`font-display text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
