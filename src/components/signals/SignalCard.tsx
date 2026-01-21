import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Clock, Target, Shield, Percent, ChevronRight } from "lucide-react";
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

export function SignalCard({ signal, index = 0, showDetails = true }: SignalCardProps) {
  const getSignalStyles = () => {
    switch (signal.type) {
      case "BUY":
        return {
          bg: "bg-success/10 border-success/30",
          text: "text-success",
          icon: TrendingUp,
          glow: "glow-success",
        };
      case "SELL":
        return {
          bg: "bg-destructive/10 border-destructive/30",
          text: "text-destructive",
          icon: TrendingDown,
          glow: "glow-danger",
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

  const riskReward = Math.abs(signal.takeProfit - signal.entry) / Math.abs(signal.entry - signal.stopLoss);

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
          <p className="text-xs text-muted-foreground mb-1">Entrada</p>
          <p className="font-mono font-semibold">{signal.entry.toFixed(5)}</p>
        </div>
        <div className="bg-destructive/10 rounded-lg p-3 text-center">
          <p className="text-xs text-destructive mb-1 flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" />
            Stop Loss
          </p>
          <p className="font-mono font-semibold text-destructive">{signal.stopLoss.toFixed(5)}</p>
        </div>
        <div className="bg-success/10 rounded-lg p-3 text-center">
          <p className="text-xs text-success mb-1 flex items-center justify-center gap-1">
            <Target className="h-3 w-3" />
            Take Profit
          </p>
          <p className="font-mono font-semibold text-success">{signal.takeProfit.toFixed(5)}</p>
        </div>
      </div>

      {/* Risk/Reward */}
      <div className="flex items-center justify-between text-sm mb-4 px-2">
        <span className="text-muted-foreground">Risco/Retorno</span>
        <span className={`font-semibold ${riskReward >= 2 ? "text-success" : "text-warning"}`}>
          1:{riskReward.toFixed(1)}
        </span>
      </div>

      {/* Reasons */}
      {showDetails && (
        <div className="border-t border-border/50 pt-4">
          <p className="text-xs text-muted-foreground mb-2">Razões Técnicas:</p>
          <ul className="space-y-1">
            {signal.reasons.slice(0, 3).map((reason, i) => (
              <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                <span className="text-primary">•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* View Details */}
      <Link to={`/analises/${signal.id}`} className="block mt-4">
        <Button variant="ghost" className="w-full group-hover:bg-secondary">
          Ver Detalhes
          <ChevronRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
        </Button>
      </Link>
    </motion.div>
  );
}
