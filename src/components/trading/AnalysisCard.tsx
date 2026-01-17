import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Shield,
  Percent,
  Activity,
  Pause,
  BarChart3,
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
  const isHold = analysis.signal_type === "HOLD" || analysis.signal_type === "WAIT";

  const formatPrice = (value: number | null) => {
    if (value === null) return "--.--";
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
    if (analysis.confidence >= 80) return "bg-green-500";
    if (analysis.confidence >= 50) return "bg-yellow-500";
    return "bg-orange-500";
  };

  const getConfidenceLabel = () => {
    if (analysis.confidence >= 80) return "SINAL FORTE";
    if (analysis.confidence >= 50) return "Sinal Moderado";
    return "Aguardar";
  };

  const getSignalLabel = () => {
    if (isBuy) return "COMPRA";
    if (isSell) return "VENDA";
    return "AGUARDAR";
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
              "w-12 h-12 rounded-xl flex items-center justify-center",
              isBuy && "bg-green-500/20",
              isSell && "bg-red-500/20",
              isHold && "bg-yellow-500/20"
            )}
          >
            {isBuy && <TrendingUp className="h-6 w-6 text-green-500" />}
            {isSell && <TrendingDown className="h-6 w-6 text-red-500" />}
            {isHold && <Pause className="h-6 w-6 text-yellow-500" />}
          </div>
          <div>
            <h3 className="font-display font-bold text-xl">{analysis.symbol}</h3>
            <span className="text-xs text-muted-foreground">
              {pairName || analysis.symbol} • {analysis.timeframe}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Badge
            variant="outline"
            className={cn(
              "text-sm font-bold px-3 py-1",
              isBuy && "border-green-500 text-green-500 bg-green-500/10",
              isSell && "border-red-500 text-red-500 bg-red-500/10",
              isHold && "border-yellow-500 text-yellow-500 bg-yellow-500/10"
            )}
          >
            {getSignalLabel()}
          </Badge>
        </div>
      </div>

      {/* Current Price */}
      <div className="mb-4 p-3 rounded-lg bg-background/50 border border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Preço Atual</span>
          <span className="font-mono font-bold text-lg">
            {formatPrice(Number(analysis.entry_price))}
          </span>
        </div>
      </div>

      {/* Confidence */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Percent className="h-4 w-4" />
            Confiança
          </span>
          <div className="flex items-center gap-2">
            <span className={cn("font-bold text-lg", getSignalColor())}>
              {analysis.confidence}%
            </span>
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs",
                analysis.confidence >= 80 && "bg-green-500/20 text-green-500",
                analysis.confidence >= 50 && analysis.confidence < 80 && "bg-yellow-500/20 text-yellow-500",
                analysis.confidence < 50 && "bg-orange-500/20 text-orange-500"
              )}
            >
              {getConfidenceLabel()}
            </Badge>
          </div>
        </div>
        <Progress
          value={analysis.confidence}
          className="h-3"
          indicatorClassName={getConfidenceColor()}
        />
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-background/50 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">RSI (14)</span>
          </div>
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "font-mono font-bold text-lg",
                Number(analysis.rsi) < 30 && "text-green-500",
                Number(analysis.rsi) > 70 && "text-red-500",
                Number(analysis.rsi) >= 30 && Number(analysis.rsi) <= 70 && "text-muted-foreground"
              )}
            >
              {Number(analysis.rsi).toFixed(1)}
            </span>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                Number(analysis.rsi) < 30 && "border-green-500/50 text-green-500",
                Number(analysis.rsi) > 70 && "border-red-500/50 text-red-500",
                Number(analysis.rsi) >= 30 && Number(analysis.rsi) <= 70 && "border-muted text-muted-foreground"
              )}
            >
              {Number(analysis.rsi) < 30 ? "Sobrevenda" : Number(analysis.rsi) > 70 ? "Sobrecompra" : "Neutro"}
            </Badge>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-background/50 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">EMA 20</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-lg">
              {formatPrice(Number(analysis.ema_short))}
            </span>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                analysis.trend === "bullish" && "border-green-500/50 text-green-500",
                analysis.trend === "bearish" && "border-red-500/50 text-red-500",
                analysis.trend === "neutral" && "border-muted text-muted-foreground"
              )}
            >
              {analysis.trend === "bullish" ? "▲ Acima" : analysis.trend === "bearish" ? "▼ Abaixo" : "= Neutro"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Entry/SL/TP - Only show for BUY or SELL */}
      {!isHold && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Target className="h-4 w-4 mx-auto mb-1 text-primary" />
            <span className="block text-xs text-muted-foreground">Entrada</span>
            <span className="font-mono font-bold text-sm">
              {formatPrice(Number(analysis.entry_price))}
            </span>
          </div>
          <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <Shield className="h-4 w-4 mx-auto mb-1 text-red-500" />
            <span className="block text-xs text-muted-foreground">Stop Loss</span>
            <span className="font-mono font-bold text-sm text-red-500">
              {formatPrice(Number(analysis.stop_loss))}
            </span>
          </div>
          <div className="text-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <Target className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <span className="block text-xs text-muted-foreground">Take Profit</span>
            <span className="font-mono font-bold text-sm text-green-500">
              {formatPrice(Number(analysis.take_profit))}
            </span>
          </div>
        </div>
      )}

      {/* Reasons */}
      {analysis.reasons && analysis.reasons.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-background/30 border border-border/30">
          <span className="text-xs font-semibold text-muted-foreground block mb-2">
            📊 Análise da IA:
          </span>
          <ul className="space-y-1">
            {analysis.reasons.map((reason, i) => (
              <li key={i} className="text-xs text-muted-foreground">
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
          <span>Análise automática</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{analyzedAt}</span>
        </div>
      </div>
    </motion.div>
  );
}
