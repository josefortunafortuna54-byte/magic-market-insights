import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Shield,
  Percent,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { MarketAnalysis } from "@/hooks/useMarketData";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AnalysisCardProps {
  analysis: MarketAnalysis;
  pairName?: string;
  index?: number;
}

export function AnalysisCard({ analysis, pairName, index = 0 }: AnalysisCardProps) {
  const isBuy = analysis.signal_type === "BUY";
  const isSell = analysis.signal_type === "SELL";
  const isWait = analysis.signal_type === "WAIT";

  const formatPrice = (value: number | null) => {
    if (value === null) return "--.--";
    const strValue = value.toString();
    if (analysis.symbol.includes("JPY")) return Number(value).toFixed(3);
    if (analysis.symbol === "XAUUSD" || analysis.symbol === "BTCUSD") {
      return Number(value).toFixed(2);
    }
    return Number(value).toFixed(5);
  };

  const getSignalColor = () => {
    if (isBuy) return "text-green-500";
    if (isSell) return "text-red-500";
    return "text-yellow-500";
  };

  const getSignalBg = () => {
    if (isBuy) return "bg-green-500/10 border-green-500/30";
    if (isSell) return "bg-red-500/10 border-red-500/30";
    return "bg-yellow-500/10 border-yellow-500/30";
  };

  const getTrendColor = () => {
    if (analysis.trend === "bullish") return "text-green-500";
    if (analysis.trend === "bearish") return "text-red-500";
    return "text-muted-foreground";
  };

  const getConfidenceColor = () => {
    if (analysis.confidence >= 75) return "bg-green-500";
    if (analysis.confidence >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const analyzedAt = analysis.analyzed_at
    ? formatDistanceToNow(new Date(analysis.analyzed_at), {
        addSuffix: true,
        locale: ptBR,
      })
    : "Desconhecido";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn("glass-card p-5 border", getSignalBg())}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              isBuy && "bg-green-500/20",
              isSell && "bg-red-500/20",
              isWait && "bg-yellow-500/20"
            )}
          >
            {isBuy && <TrendingUp className="h-5 w-5 text-green-500" />}
            {isSell && <TrendingDown className="h-5 w-5 text-red-500" />}
            {isWait && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
          </div>
          <div>
            <h3 className="font-display font-bold text-lg">{analysis.symbol}</h3>
            <span className="text-xs text-muted-foreground">
              {pairName || analysis.symbol}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Badge
            variant="outline"
            className={cn(
              "text-sm font-bold",
              isBuy && "border-green-500 text-green-500",
              isSell && "border-red-500 text-red-500",
              isWait && "border-yellow-500 text-yellow-500"
            )}
          >
            {analysis.signal_type === "WAIT" ? "AGUARDAR" : analysis.signal_type}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {analysis.timeframe}
          </Badge>
        </div>
      </div>

      {/* Confidence */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Percent className="h-3 w-3" />
            Confiança
          </span>
          <span className={cn("font-bold", getSignalColor())}>
            {analysis.confidence}%
          </span>
        </div>
        <Progress
          value={analysis.confidence}
          className="h-2"
          indicatorClassName={getConfidenceColor()}
        />
      </div>

      {/* Prices */}
      {!isWait && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 rounded-lg bg-background/50">
            <Target className="h-4 w-4 mx-auto mb-1 text-primary" />
            <span className="block text-xs text-muted-foreground">Entrada</span>
            <span className="font-mono font-bold text-sm">
              {formatPrice(Number(analysis.entry_price))}
            </span>
          </div>
          <div className="text-center p-2 rounded-lg bg-background/50">
            <Shield className="h-4 w-4 mx-auto mb-1 text-red-500" />
            <span className="block text-xs text-muted-foreground">Stop Loss</span>
            <span className="font-mono font-bold text-sm text-red-500">
              {formatPrice(Number(analysis.stop_loss))}
            </span>
          </div>
          <div className="text-center p-2 rounded-lg bg-background/50">
            <Target className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <span className="block text-xs text-muted-foreground">Take Profit</span>
            <span className="font-mono font-bold text-sm text-green-500">
              {formatPrice(Number(analysis.take_profit))}
            </span>
          </div>
        </div>
      )}

      {/* Indicators */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex items-center justify-between p-2 rounded bg-background/30">
          <span className="text-muted-foreground">RSI(14)</span>
          <span
            className={cn(
              "font-mono font-medium",
              Number(analysis.rsi) < 30 && "text-green-500",
              Number(analysis.rsi) > 70 && "text-red-500"
            )}
          >
            {Number(analysis.rsi).toFixed(1)}
          </span>
        </div>
        <div className="flex items-center justify-between p-2 rounded bg-background/30">
          <span className="text-muted-foreground">Tendência</span>
          <span className={cn("font-medium capitalize", getTrendColor())}>
            {analysis.trend === "bullish"
              ? "Alta"
              : analysis.trend === "bearish"
              ? "Baixa"
              : "Neutro"}
          </span>
        </div>
      </div>

      {/* Reasons */}
      {analysis.reasons && analysis.reasons.length > 0 && (
        <div className="mb-4">
          <span className="text-xs font-medium text-muted-foreground block mb-2">
            Razões da análise:
          </span>
          <ul className="space-y-1">
            {analysis.reasons.slice(0, 3).map((reason, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Activity className="h-3 w-3 text-green-500 animate-pulse" />
          <span>Atualização automática</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{analyzedAt}</span>
        </div>
      </div>
    </motion.div>
  );
}
