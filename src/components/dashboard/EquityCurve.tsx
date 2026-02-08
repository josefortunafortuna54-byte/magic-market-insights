import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export function EquityCurve() {
  const { data: equityData, isLoading } = useQuery({
    queryKey: ["equity-curve"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trades_history")
        .select("profit_percent, closed_at")
        .order("closed_at", { ascending: true });

      if (error) throw error;

      // Build cumulative equity curve from real trades
      const startingBalance = 10000;
      let balance = startingBalance;
      const points = [{ day: "Início", equity: startingBalance }];

      if (data && data.length > 0) {
        for (const trade of data) {
          balance = balance * (1 + trade.profit_percent / 100);
          const date = new Date(trade.closed_at);
          points.push({
            day: `${date.getDate()}/${date.getMonth() + 1}`,
            equity: Math.round(balance),
          });
        }
      }

      return points;
    },
  });

  const points = equityData || [{ day: "Início", equity: 10000 }];
  const startVal = points[0]?.equity || 10000;
  const endVal = points[points.length - 1]?.equity || 10000;
  const growth = (((endVal - startVal) / startVal) * 100).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-bold">Curva de Crescimento</h3>
            <p className="text-xs text-muted-foreground">Equity Curve • Dados Reais</p>
          </div>
        </div>
        <div className="text-right">
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <p className={`font-display text-2xl font-bold ${Number(growth) >= 0 ? "text-primary" : "text-destructive"}`}>
                {Number(growth) >= 0 ? "+" : ""}{growth}%
              </p>
              <p className="text-xs text-muted-foreground">Crescimento</p>
            </>
          )}
        </div>
      </div>

      <div className="h-64">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points}>
              <defs>
                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(160 84% 39%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(160 84% 39%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                tick={{ fill: 'hsl(220 15% 55%)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'hsl(220 15% 55%)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={['dataMin - 200', 'dataMax + 200']}
                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(230 25% 8%)',
                  border: '1px solid hsl(230 20% 15%)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: 'hsl(210 40% 98%)',
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Equity']}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="hsl(160 84% 39%)"
                strokeWidth={2}
                fill="url(#equityGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}
