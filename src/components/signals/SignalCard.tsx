import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Clock, Target, Shield, Percent, ChevronRight, Activity, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export interface Signal {
  id: string;
  pair: string;
  timeframe: string;
  type: "BUY" | "SELL" | "AGUARDAR";
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  reasons: string[];
  createdAt: string;
  status?: "active" | "tp" | "sl";
}

interface SignalCardProps {
  signal: Signal;
  index?: number;
  showDetails?: boolean;
}

function pipMultiplier(pair: string): number {
  if (pair.includes("JPY")) return 100;
  if (pair.includes("XAU")) return 100;
  if (pair.includes("BTC")) return 1;
  return 10000;
}

export function SignalCard({ signal, index = 0, showDetails = true }: SignalCardProps) {
  const getSignalStyles = () => {
    switch (signal.type) {
      case "BUY":
        return {
          bg: "bg-success/10 border-success/30",
          text: "text-success",
          icon: TrendingUp,
          glow: "shadow-[0_0_20px_rgba(34,197,94,0.12)]",
        };
      case "SELL":
        return {
          bg: "bg-destructive/10 border-destructive/30",
          text: "text-destructive",
          icon: TrendingDown,
          glow: "shadow-[0_0_20px_rgba(239,68,68,0.12)]",
        };
      default:
        return {
          bg: "bg-warning/10 border-warning/30",
          text: "text-warning",
          icon: Clock,
          glow: "",
        };
    }
  };

  const styles = getSignalStyles();
  const Icon = styles.icon;
  const pp = pipMultiplier(signal.pair);
  const riskReward = Math.abs(signal.takeProfit - signal.entry) / Math.abs(signal.entry - signal.stopLoss);
  const slPips = Math.abs(signal.entry - signal.stopLoss) * pp;
  const tpPips = Math.abs(signal.takeProfit - signal.entry) * pp;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card p-6 hover:border-primary/30 transition-all duration-300 group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display text-xl font-bold">{signal.pair}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {signal.timeframe}
            </Badge>
            {signal.status && (
              <Badge
                variant={signal.status === "tp" ? "default" : signal.status === "sl" ? "destructive" : "secondary"}
                className="text-xs"
              >
                {signal.status === "tp" ? "✓ TP" : signal.status === "sl" ? "✗ SL" : "Ativo"}
              </Badge>
            )}
          </div>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${styles.bg} ${styles.glow}`}>
          <Icon className={`h-5 w-5 ${styles.text}`} />
          <span className={`font-bold ${styles.text}`}>{signal.type}</span>
        </div>
      </div>

      {/* Confidence */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-muted-foreground flex items-center gap-1">
            <Percent className="h-4 w-4" />
            Confiança
          </span>
          <span className={`font-semibold ${signal.confidence >= 80 ? "text-success" : signal.confidence >= 60 ? "text-warning" : "text-muted-foreground"}`}>
            {signal.confidence}%
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${signal.confidence}%` }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className={`h-full rounded-full ${
              signal.confidence >= 80 ? "bg-success" : signal.confidence >= 60 ? "bg-warning" : "bg-muted"
            }`}
          />
        </div>
      </div>

      {/* Levels */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <p className="text-xs text-primary mb-1">Entrada</p>
          <p className="font-mono font-semibold text-sm">{signal.entry.toFixed(5)}</p>
        </div>
        <div className="bg-destructive/10 rounded-lg p-3 text-center">
          <p className="text-xs text-destructive mb-1 flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" />
            SL
          </p>
          <p className="font-mono font-semibold text-sm text-destructive">{signal.stopLoss.toFixed(5)}</p>
          <p className="text-[10px] text-destructive/70">{slPips.toFixed(1)}p</p>
        </div>
        <div className="bg-success/10 rounded-lg p-3 text-center">
          <p className="text-xs text-success mb-1 flex items-center justify-center gap-1">
            <Target className="h-3 w-3" />
            TP
          </p>
          <p className="font-mono font-semibold text-sm text-success">{signal.takeProfit.toFixed(5)}</p>
          <p className="text-[10px] text-success/70">{tpPips.toFixed(1)}p</p>
        </div>
      </div>

      {/* Risk/Reward */}
      <div className="flex items-center justify-between text-sm mb-4 px-2">
        <span className="text-muted-foreground flex items-center gap-1">
          <Zap className="h-3 w-3" /> Risco/Retorno
        </span>
        <span className={`font-semibold ${riskReward >= 2 ? "text-success" : "text-warning"}`}>
          1:{riskReward.toFixed(1)}
        </span>
      </div>

      {/* Reasons */}
      {showDetails && signal.reasons.length > 0 && (
        <div className="border-t border-border/50 pt-4">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Activity className="h-3 w-3" /> Análise Técnica
          </p>
          <ul className="space-y-1.5">
            {signal.reasons.slice(0, 3).map((reason, i) => {
              const isBearish = reason.toLowerCase().includes("bearish") || reason.toLowerCase().includes("sobrecompra") || reason.toLowerCase().includes("abaixo");
              const isBullish = reason.toLowerCase().includes("bullish") || reason.toLowerCase().includes("sobrevenda") || reason.toLowerCase().includes("acima");
              return (
                <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5 ${
                    isBullish ? "bg-success/20 text-success" : isBearish ? "bg-destructive/20 text-destructive" : "bg-primary/10 text-primary"
                  }`}>
                    {i + 1}
                  </span>
                  {reason}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* View Details */}
      <Link to={`/analises/${signal.id}`} className="block mt-4">
        <Button variant="ghost" className="w-full group-hover:bg-secondary">
          Ver Análise Completa
          <ChevronRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
        </Button>
      </Link>
    </motion.div>
  );
}
