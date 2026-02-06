import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

const equityData = [
  { day: "Jan 1", equity: 10000 },
  { day: "Jan 5", equity: 10250 },
  { day: "Jan 10", equity: 10480 },
  { day: "Jan 15", equity: 10320 },
  { day: "Jan 20", equity: 10780 },
  { day: "Jan 25", equity: 11050 },
  { day: "Fev 1", equity: 10900 },
  { day: "Fev 5", equity: 11300 },
  { day: "Fev 10", equity: 11680 },
  { day: "Fev 15", equity: 11450 },
  { day: "Fev 20", equity: 12100 },
  { day: "Fev 25", equity: 12450 },
  { day: "Mar 1", equity: 12847 },
];

export function EquityCurve() {
  const growth = (((equityData[equityData.length - 1].equity - equityData[0].equity) / equityData[0].equity) * 100).toFixed(1);

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
            <p className="text-xs text-muted-foreground">Equity Curve • Últimos 60 dias</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-bold text-primary">+{growth}%</p>
          <p className="text-xs text-muted-foreground">Crescimento</p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={equityData}>
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
      </div>
    </motion.div>
  );
}
