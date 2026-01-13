import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Clock, Target, Shield, Percent, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { Signal } from "@/hooks/useSignals";

interface SignalCardProps {
  signal: Signal;
  index?: number;
  isPremiumLocked?: boolean;
}

export function SignalCard({ signal, index = 0, isPremiumLocked = false }: SignalCardProps) {
  const pair = signal.trading_pairs;

  const getSignalStyles = () => {
    switch (signal.signal_type) {
      case "BUY":
        return {
          bg: "bg-success/10 border-success/30",
          text: "text-success",
          icon: TrendingUp,
        };
      case "SELL":
        return {
          bg: "bg-destructive/10 border-destructive/30",
          text: "text-destructive",
          icon: TrendingDown,
        };
      default:
        return {
          bg: "bg-warning/10 border-warning/30",
          text: "text-warning",
          icon: Clock,
        };
    }
  };

  const styles = getSignalStyles();
  const Icon = styles.icon;

  const riskReward = Math.abs(signal.take_profit - signal.entry_price) / Math.abs(signal.entry_price - signal.stop_loss);

  if (isPremiumLocked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="glass-card p-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
          <Lock className="h-8 w-8 text-warning mb-2" />
          <p className="text-sm font-medium mb-3">Conteúdo Premium</p>
          <Link to="/planos">
            <Button variant="premium" size="sm">
              Tornar-se Premium
            </Button>
          </Link>
        </div>
        <div className="blur-sm">
          <div className="h-4 bg-muted rounded w-24 mb-2" />
          <div className="h-6 bg-muted rounded w-16" />
        </div>
      </motion.div>
    );
  }

  const getStatusBadge = () => {
    switch (signal.status) {
      case "tp":
        return <Badge variant="success">✓ TP</Badge>;
      case "sl":
        return <Badge variant="destructive">✗ SL</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelado</Badge>;
      default:
        return <Badge variant="default">Ativo</Badge>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card p-6 hover:border-primary/30 transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display text-xl font-bold">{pair?.symbol}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {signal.timeframe}
            </Badge>
            {getStatusBadge()}
            {pair?.is_premium && (
              <Badge variant="warning" className="text-xs">
                Premium
              </Badge>
            )}
          </div>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${styles.bg}`}>
          <Icon className={`h-5 w-5 ${styles.text}`} />
          <span className={`font-bold ${styles.text}`}>{signal.signal_type}</span>
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
        <div className="bg-success/10 rounded-lg p-3 text-center border border-success/20">
          <p className="text-xs text-success mb-1">Entrada</p>
          <p className="font-mono font-semibold text-success">{signal.entry_price.toFixed(5)}</p>
        </div>
        <div className="bg-destructive/10 rounded-lg p-3 text-center border border-destructive/20">
          <p className="text-xs text-destructive mb-1 flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" />
            SL
          </p>
          <p className="font-mono font-semibold text-destructive">{signal.stop_loss.toFixed(5)}</p>
        </div>
        <div className="bg-primary/10 rounded-lg p-3 text-center border border-primary/20">
          <p className="text-xs text-primary mb-1 flex items-center justify-center gap-1">
            <Target className="h-3 w-3" />
            TP
          </p>
          <p className="font-mono font-semibold text-primary">{signal.take_profit.toFixed(5)}</p>
        </div>
      </div>

      {/* Risk/Reward */}
      <div className="flex items-center justify-between text-sm px-2">
        <span className="text-muted-foreground">RR</span>
        <span className={`font-semibold ${riskReward >= 2 ? "text-success" : "text-warning"}`}>
          1:{riskReward.toFixed(1)}
        </span>
      </div>
    </motion.div>
  );
}
